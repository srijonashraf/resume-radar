import express from "express";
import rateLimit from "express-rate-limit";
import {
  requireAuth,
  optionalAuth,
  type AuthRequest,
} from "../middleware/auth";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../middleware/asyncHandler";
import { verifyGoogleIdToken, signAppToken } from "../services/authService";
import { checkGuestUsage } from "../services/guestService";
import {
  MODEL,
} from "../services/aiService";
import { runExtractionPipeline, runAnalysisPipeline, runTailorPipeline } from "../services/pipelineService";
import { loadRewrites, updateRewriteAcceptance } from "../db/rewrites";
import { loadAnalysisDocument, loadAnalysisResults } from "../db/sections";
import { getHistoryList, getHistoryDetail, deleteHistoryEntry } from "../db/history";
import { upsertUserFromGoogleProfile, incrementAnalysisCount } from "../services/userService";
import { ValidationError, NotFoundError } from "../errors";
import pool from "../config/database";

const router = express.Router();

const USER_ANALYSIS_LIMIT = parseInt(process.env.USER_ANALYSIS_LIMIT || "10", 10);

/**
 * AI-specific rate limiter: 100 requests per minute per IP.
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please wait 5 minutes before trying again." },
  handler: (_req, res) => {
    res.setHeader("Retry-After", "300");
    res.status(429).json({ error: "Too many AI requests. Please wait 5 minutes before trying again." });
  },
});

// ==================== AUTH ====================

router.post(
  "/auth/google",
  asyncHandler(async (req, res) => {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== "string") {
      throw new ValidationError("idToken is required");
    }

    const profile = await verifyGoogleIdToken(idToken);
    const user = await upsertUserFromGoogleProfile(profile);
    const token = signAppToken(user.id);

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
      },
    });
  }),
);

// ==================== HEALTH & STATUS ====================

router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        database: "connected",
        uptime: process.uptime(),
      },
    });
  }),
);

router.get(
  "/guest-status",
  asyncHandler(async (req, res) => {
    const guestUsage = await checkGuestUsage(req);

    res.json({
      data: {
        allowed: guestUsage.allowed,
        message: guestUsage.message,
        requiresLogin: !guestUsage.allowed,
      },
    });
  }),
);

// ==================== EXTRACTION ROUTE ====================

const PDF_MAGIC = Buffer.from("%PDF-");

function sanitizeFileName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const base = name.replace(/^.*[/\\]/, "");
  return base.length > 255 ? base.slice(0, 255) : base;
}

// Conditionally apply multer for multipart uploads
const conditionalUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ct = req.headers["content-type"] || "";
  if (ct.includes("multipart/form-data")) {
    upload.single("resume")(req, res, next);
  } else {
    next();
  }
};

router.post(
  "/extract",
  aiRateLimiter,
  optionalAuth,
  conditionalUpload,
  async (req: AuthRequest, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const sendSSE = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const userId = req.user?.id ?? null;

    try {
      let input: { pdfBuffer?: Buffer; text?: string; userId?: string | null; originalFileName?: string; aiModelVersion?: string };

      if (req.file) {
        // Multipart upload — validate PDF magic bytes
        const buffer = req.file.buffer;
        if (buffer.length < 5 || !buffer.slice(0, 5).equals(PDF_MAGIC)) {
          sendSSE("error", { error: "File is not a valid PDF." });
          res.end();
          return;
        }

        input = {
          pdfBuffer: buffer,
          userId,
          originalFileName: sanitizeFileName(req.file.originalname),
          aiModelVersion: MODEL,
        };
      } else {
        // JSON body with text
        const { resumeText } = req.body;
        if (!resumeText || typeof resumeText !== "string") {
          sendSSE("error", { error: "resumeText is required" });
          res.end();
          return;
        }
        if (resumeText.length > 50000) {
          sendSSE("error", { error: "Resume text exceeds maximum length (50,000 characters)." });
          res.end();
          return;
        }
        input = { text: resumeText, userId, aiModelVersion: MODEL };
      }

      const result = await runExtractionPipeline(input, sendSSE);

      // Increment analysis count for authenticated users
      if (userId) {
        try {
          await incrementAnalysisCount(userId);
        } catch (dbError) {
          console.error("Failed to increment analysis count:", dbError);
        }
      }

      sendSSE("complete", result);
      res.end();
    } catch (error) {
      if (error instanceof Error && "outcome" in error) {
        // Validation error — already sent via SSE in pipeline
        res.end();
        return;
      }
      console.error("Extraction error:", error);
      sendSSE("error", { error: "Extraction failed. Please try again." });
      res.end();
    }
  },
);

// ==================== ANALYSIS ROUTE ====================

router.post(
  "/analyze",
  aiRateLimiter,
  requireAuth,
  async (req: AuthRequest, res) => {
    const { analysisId, jobDescription } = req.body;
    const userId = req.user!.id;

    if (!analysisId || typeof analysisId !== "string") {
      res.status(400).json({ error: "analysisId is required" });
      return;
    }

    if (jobDescription !== undefined && typeof jobDescription !== "string") {
      res.status(400).json({ error: "jobDescription must be a string" });
      return;
    }

    // Ownership check
    const ownershipResult = await pool.query(
      "SELECT user_id FROM public.resume_analyses WHERE id = $1",
      [analysisId],
    );

    if (ownershipResult.rows.length === 0) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    if (ownershipResult.rows[0].user_id !== userId) {
      res.status(403).json({ error: "You do not own this analysis" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const sendSSE = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await runAnalysisPipeline(
        { analysisId, jobDescription: jobDescription || undefined },
        sendSSE,
      );
      res.end();
    } catch (error) {
      console.error("Analysis error:", error);
      sendSSE("error", {
        error: error instanceof Error ? error.message : "Analysis failed",
      });
      res.end();
    }
  },
);

// ==================== USAGE ROUTES ====================

router.get(
  "/usage",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const countResult = await pool.query(
      "SELECT analysis_count FROM users WHERE id = $1",
      [userId],
    );
    const used = Number(countResult.rows[0].analysis_count);
    res.json({
      data: {
        used,
        limit: USER_ANALYSIS_LIMIT,
        remaining: Math.max(USER_ANALYSIS_LIMIT - used, 0),
      },
    });
  }),
);

// ==================== HISTORY (v2) ====================

router.get(
  "/history",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || "10", 10)));

    const result = await getHistoryList(userId, page, limit);

    res.json({
      data: result.items,
      metadata: {
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      },
    });
  }),
);

router.get(
  "/history/:analysisId",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const analysisId = req.params.analysisId as string;
    const userId = req.user!.id;

    const meta = await getHistoryDetail(analysisId, userId);
    if (!meta) throw new NotFoundError("Analysis not found");

    const documentData = await loadAnalysisDocument(analysisId);
    const analysisResults = await loadAnalysisResults(analysisId);
    const rewrites = await loadRewrites(analysisId);

    res.json({
      data: {
        id: meta.id,
        originalFileName: meta.originalFileName,
        sourceType: meta.sourceType,
        createdAt: meta.createdAt,
        document: documentData?.document ?? null,
        analysisResults,
        rewrites,
      },
    });
  }),
);

router.delete(
  "/history/:analysisId",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const analysisId = req.params.analysisId as string;
    const userId = req.user!.id;

    const deleted = await deleteHistoryEntry(analysisId, userId);
    if (!deleted) throw new NotFoundError("Analysis not found");

    res.json({ data: { deleted: true } });
  }),
);

// ==================== TEMPORARILY DISABLED (Phase 3) ====================

// /job-match, /career-map return 503 until rebuilt against new data model.

router.post(
  "/job-match",
  aiRateLimiter,
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.status(503).json({
      error: "This feature is temporarily disabled during a major upgrade. It will return in Phase 3.",
    });
  }),
);

router.post(
  "/career-map",
  aiRateLimiter,
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.status(503).json({
      error: "This feature is temporarily disabled during a major upgrade. It will return in Phase 3.",
    });
  }),
);

router.post(
  "/tailor",
  aiRateLimiter,
  requireAuth,
  async (req: AuthRequest, res) => {
    const { analysisId, jobDescription } = req.body;
    const userId = req.user!.id;

    if (!analysisId || typeof analysisId !== "string") {
      res.status(400).json({ error: "analysisId is required" });
      return;
    }

    if (!jobDescription || typeof jobDescription !== "string") {
      res.status(400).json({ error: "jobDescription is required" });
      return;
    }

    // Ownership check
    const ownershipResult = await pool.query(
      "SELECT user_id FROM public.resume_analyses WHERE id = $1",
      [analysisId],
    );

    if (ownershipResult.rows.length === 0) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    if (ownershipResult.rows[0].user_id !== userId) {
      res.status(403).json({ error: "You do not own this analysis" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const sendSSE = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await runTailorPipeline({ analysisId, jobDescription }, sendSSE);
      res.end();
    } catch (error) {
      console.error("Tailor error:", error);
      sendSSE("error", {
        error: error instanceof Error ? error.message : "Tailoring failed",
      });
      res.end();
    }
  },
);

router.get(
  "/tailor/:analysisId",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const analysisId = req.params.analysisId as string;
    const userId = req.user!.id;

    // Ownership check
    const ownershipResult = await pool.query(
      "SELECT user_id FROM public.resume_analyses WHERE id = $1",
      [analysisId],
    );

    if (ownershipResult.rows.length === 0) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    if (ownershipResult.rows[0].user_id !== userId) {
      res.status(403).json({ error: "You do not own this analysis" });
      return;
    }

    const rewrites = await loadRewrites(analysisId);
    res.json({ data: rewrites });
  }),
);

router.patch(
  "/tailor/rewrite/:rewriteId",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const rewriteId = req.params.rewriteId as string;
    const { accepted } = req.body;
    const userId = req.user!.id;

    if (typeof accepted !== "boolean") {
      res.status(400).json({ error: "accepted (boolean) is required" });
      return;
    }

    // Ownership check: verify rewrite belongs to user's analysis
    const ownershipResult = await pool.query(
      `SELECT ra.user_id FROM public.resume_tailor_rewrites rtr
       JOIN public.resume_analyses ra ON rtr.analysis_id = ra.id
       WHERE rtr.id = $1`,
      [rewriteId],
    );

    if (ownershipResult.rows.length === 0) {
      res.status(404).json({ error: "Rewrite not found" });
      return;
    }

    if (ownershipResult.rows[0].user_id !== userId) {
      res.status(403).json({ error: "You do not own this rewrite" });
      return;
    }

    const updated = await updateRewriteAcceptance(rewriteId, accepted);
    res.json({ data: updated });
  }),
);

export default router;

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
  compareWithJobDescription,
  generateCareerMap,
  tailorResume,
  MODEL,
  type TokenUsage,
} from "../services/aiService";
import {
  saveTokenUsage,
} from "../services/historyService";
import { runExtractionPipeline, runAnalysisPipeline } from "../services/pipelineService";
import { upsertUserFromGoogleProfile, incrementAnalysisCount } from "../services/userService";
import { ValidationError } from "../errors";
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

// ==================== TEMPORARILY DISABLED (Phase 3) ====================

// /job-match, /career-map, /tailor return 503 until rebuilt against new data model.
// History endpoints disabled until rebuilt against new schema.

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
  asyncHandler(async (_req, res) => {
    res.status(503).json({
      error: "This feature is temporarily disabled during a major upgrade. It will return in Phase 3.",
    });
  }),
);

export default router;

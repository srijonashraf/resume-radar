import express from "express";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";
import {
  analyzeResume,
  generateCareerMap,
  smartRewrite,
  compareWithJobDescription,
  tailorResume,
  ResumeAnalysisSuccess,
} from "../services/geminiService";

const router = express.Router();

// ==================== HEALTH & STATUS ====================

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Check guest usage status
router.get("/guest-status", async (req, res) => {
  try {
    const { checkGuestUsage } = await import("../services/guestService");
    const guestUsage = await checkGuestUsage(req);

    res.json({
      allowed: guestUsage.allowed,
      message: guestUsage.message,
      requiresLogin: !guestUsage.allowed,
    });
  } catch (error) {
    console.error("Error checking guest status:", error);
    res.status(500).json({ error: "Failed to check guest status" });
  }
});

// ==================== ANALYSIS ROUTES ====================

// Resume Analysis - Allows guest users (1 analysis limit)
router.post("/analyze", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText || typeof resumeText !== "string") {
      res.status(400).json({
        error: "Resume text is required and must be a string",
      });
      return;
    }

    // Check resume text length (max 50KB)
    if (resumeText.length > 50000) {
      res.status(400).json({
        error: "Resume text is too long. Maximum 50,000 characters allowed.",
      });
      return;
    }

    const result = await analyzeResume(resumeText);

    // Check if AI detected non-resume content
    if ("error" in result && result.error === "NOT_A_RESUME") {
      res.status(400).json({
        error: result.message,
        detectedType: result.detectedType,
      });
      return;
    }

    // Type guard - ensure we have a successful analysis
    const analysis = result as ResumeAnalysisSuccess;

    // Prepare response with enhanced data
    const response: any = {
      ...analysis,
      metadata: {
        analyzedAt: new Date().toISOString(),
        analysisVersion: "2.0",
      },
    };

    // Add guest usage info if applicable
    if (req.guestUsage && !req.user) {
      response.isGuest = true;
      response.guestId = req.guestUsage.guestId;
      response.remainingAnalyses = Math.max(
        0,
        1 - (req.guestUsage.analysisCount || 0)
      );
      response.message =
        req.guestUsage.analysisCount === 1
          ? "You've used your free analysis. Login to analyze more resumes."
          : null;
    }

    res.json(response);
  } catch (error) {
    console.error("Error analyzing resume:", error);
    res.status(500).json({
      error: "Failed to analyze resume. Please try again later.",
    });
  }
});

// Job Match - Requires authentication
router.post("/job-match", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      res.status(400).json({
        error: "Resume text and job description are required",
      });
      return;
    }

    if (typeof resumeText !== "string" || typeof jobDescription !== "string") {
      res.status(400).json({
        error: "Resume text and job description must be strings",
      });
      return;
    }

    const result = await compareWithJobDescription(resumeText, jobDescription);

    res.json({
      ...result,
      metadata: {
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error comparing with job description:", error);
    res.status(500).json({
      error: "Failed to compare with job description. Please try again later.",
    });
  }
});

// Tailor Resume - Requires authentication
router.post("/tailor", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      res.status(400).json({
        error: "Resume text and job description are required",
      });
      return;
    }

    if (typeof resumeText !== "string" || typeof jobDescription !== "string") {
      res.status(400).json({
        error: "Resume text and job description must be strings",
      });
      return;
    }

    const result = await tailorResume(resumeText, jobDescription);

    res.json(result);
  } catch (error) {
    console.error("Error tailoring resume:", error);
    res.status(500).json({
      error: "Failed to tailor resume. Please try again later.",
    });
  }
});

// Career Map - Requires authentication
router.post("/career-map", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText) {
      res.status(400).json({ error: "Resume text is required" });
      return;
    }

    if (typeof resumeText !== "string") {
      res.status(400).json({ error: "Resume text must be a string" });
      return;
    }

    const result = await generateCareerMap(resumeText);

    res.json({
      ...result,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating career map:", error);
    res.status(500).json({
      error: "Failed to generate career map. Please try again later.",
    });
  }
});

// Smart Rewrite - Requires authentication
router.post("/rewrite", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { originalText, jobDescription } = req.body;

    if (!originalText || !jobDescription) {
      res.status(400).json({
        error: "Original text and job description are required",
      });
      return;
    }

    if (
      typeof originalText !== "string" ||
      typeof jobDescription !== "string"
    ) {
      res.status(400).json({
        error: "Original text and job description must be strings",
      });
      return;
    }

    const result = await smartRewrite(originalText, jobDescription);

    res.json({
      ...result,
      metadata: {
        rewrittenAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error rewriting text:", error);
    res.status(500).json({
      error: "Failed to rewrite text. Please try again later.",
    });
  }
});

// ==================== HISTORY ROUTES ====================

// Get user's analysis history with pagination
router.get("/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Validate pagination params
    if (limit < 1 || limit > 100) {
      res.status(400).json({ error: "Limit must be between 1 and 100" });
      return;
    }

    if (offset < 0) {
      res.status(400).json({ error: "Offset must be non-negative" });
      return;
    }

    const { getUserHistory, getUserHistoryCount } = await import(
      "../services/historyService"
    );

    const [history, total] = await Promise.all([
      getUserHistory(userId, limit, offset),
      getUserHistoryCount(userId),
    ]);

    res.json({
      data: history,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Get history summary and analytics
router.get("/history/summary", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const { getUserHistorySummary } = await import(
      "../services/historyService"
    );
    const summary = await getUserHistorySummary(userId);

    res.json(summary);
  } catch (error) {
    console.error("Error fetching history summary:", error);
    res.status(500).json({ error: "Failed to fetch history summary" });
  }
});

// Get skill gap trends
router.get(
  "/history/skill-trends",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const { getSkillGapTrends } = await import("../services/historyService");
      const trends = await getSkillGapTrends(userId);

      res.json({ trends });
    } catch (error) {
      console.error("Error fetching skill trends:", error);
      res.status(500).json({ error: "Failed to fetch skill trends" });
    }
  }
);

// Get experience level progression
router.get(
  "/history/progression",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const { getExperienceLevelProgression } = await import(
        "../services/historyService"
      );
      const progression = await getExperienceLevelProgression(userId);

      res.json({ progression });
    } catch (error) {
      console.error("Error fetching progression:", error);
      res.status(500).json({ error: "Failed to fetch progression data" });
    }
  }
);

// Get specific history entry by ID
router.get("/history/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const { id } = req.params;
    const { getHistoryEntryById } = await import("../services/historyService");
    const entry = await getHistoryEntryById(id, userId);

    if (!entry) {
      res.status(404).json({ error: "History entry not found" });
      return;
    }

    res.json(entry);
  } catch (error) {
    console.error("Error fetching history entry:", error);
    res.status(500).json({ error: "Failed to fetch history entry" });
  }
});

// Create new history entry - Only for authenticated users
router.post("/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const { id, resumeText, analysis } = req.body;

    // Validate required fields
    if (!id || !resumeText || !analysis) {
      res.status(400).json({
        error:
          "Missing required fields: id, resumeText, and analysis are required",
      });
      return;
    }

    // Validate analysis object structure
    if (
      !analysis.overallScore ||
      !analysis.scores ||
      !analysis.experienceLevel
    ) {
      res.status(400).json({
        error: "Invalid analysis object structure",
      });
      return;
    }

    const { createHistoryEntry } = await import("../services/historyService");

    const entry = await createHistoryEntry({
      id,
      user_id: userId,
      resume_text: resumeText,
      education_score: analysis.scores.education,
      leadership_score: analysis.scores.leadership,
      overall_score: analysis.overallScore,
      experience_level: analysis.experienceLevel,
      years_of_experience: analysis.yearsOfExperience || 0,
      missing_skills: analysis.missingSkills || [],
      suggestions: [
        ...(analysis.recommendations?.immediate || []),
        ...(analysis.recommendations?.shortTerm || []),
      ],
      full_analysis: analysis,
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error("Error creating history entry:", error);
    res.status(500).json({ error: "Failed to create history entry" });
  }
});

// Delete history entry
router.delete("/history/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const { id } = req.params;
    const { deleteHistoryEntry } = await import("../services/historyService");
    const deleted = await deleteHistoryEntry(id, userId);

    if (deleted) {
      res.json({ success: true, message: "History entry deleted" });
    } else {
      res
        .status(404)
        .json({ error: "History entry not found or already deleted" });
    }
  } catch (error) {
    console.error("Error deleting history entry:", error);
    res.status(500).json({ error: "Failed to delete history entry" });
  }
});

// Delete all history for user
router.delete("/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const { deleteAllUserHistory } = await import("../services/historyService");
    const deletedCount = await deleteAllUserHistory(userId);

    res.json({
      success: true,
      message: `Deleted ${deletedCount} history entries`,
      deletedCount,
    });
  } catch (error) {
    console.error("Error deleting all history:", error);
    res.status(500).json({ error: "Failed to delete history" });
  }
});

export default router;

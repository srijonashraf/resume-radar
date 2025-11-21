import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  analyzeResume,
  generateCareerMap,
  smartRewrite,
  compareWithJobDescription,
} from "../services/geminiService";

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Resume Analysis
router.post("/analyze", requireAuth, async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText) {
      res.status(400).json({ error: "Resume text is required" });
      return;
    }
    const result = await analyzeResume(resumeText);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

// Job Match
router.post("/job-match", requireAuth, async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    if (!resumeText || !jobDescription) {
      res
        .status(400)
        .json({ error: "Resume text and job description are required" });
      return;
    }
    const result = await compareWithJobDescription(resumeText, jobDescription);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to compare with job description" });
  }
});

// Career Map
router.post("/career-map", requireAuth, async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText) {
      res.status(400).json({ error: "Resume text is required" });
      return;
    }
    const result = await generateCareerMap(resumeText);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate career map" });
  }
});

// Smart Rewrite
router.post("/rewrite", requireAuth, async (req, res) => {
  try {
    const { originalText, jobDescription } = req.body;
    if (!originalText || !jobDescription) {
      res
        .status(400)
        .json({ error: "Original text and job description are required" });
      return;
    }
    const result = await smartRewrite(originalText, jobDescription);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to rewrite text" });
  }
});

// ==================== HISTORY ROUTES ====================

// Get user's analysis history
router.get("/history", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const { getUserHistory } = await import("../services/historyService");
    const history = await getUserHistory(userId);
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Create new history entry
router.post("/history", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const {
      id,
      resumeText,
      skillsScore,
      experienceScore,
      formatScore,
      missingSkills,
      suggestions,
    } = req.body;

    if (
      !id ||
      !resumeText ||
      skillsScore === undefined ||
      experienceScore === undefined ||
      formatScore === undefined
    ) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const { createHistoryEntry } = await import("../services/historyService");
    const entry = await createHistoryEntry({
      id,
      user_id: userId,
      resume_text: resumeText,
      skills_score: skillsScore,
      experience_score: experienceScore,
      format_score: formatScore,
      missing_skills: missingSkills || [],
      suggestions: suggestions || [],
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create history entry" });
  }
});

// Delete history entry
router.delete("/history/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
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
      res.status(404).json({ error: "History entry not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete history entry" });
  }
});

export default router;

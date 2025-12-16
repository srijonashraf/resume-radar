import pool from "../config/database";
import { ResumeAnalysisSuccess } from "./geminiService";

// ==================== TYPE DEFINITIONS ====================

export interface AnalysisHistoryEntry {
  id: string;
  user_id: string;
  resume_text: string;

  // Enhanced scores
  education_score: number;
  leadership_score: number;
  overall_score: number;

  // Experience level and years
  experience_level: string;
  years_of_experience: number;

  // Skills and suggestions
  missing_skills: string[];
  suggestions: string[];

  // Complete analysis data (JSONB)
  full_analysis: ResumeAnalysisSuccess;

  // Metadata
  created_at: Date;
}

export interface CreateHistoryEntryInput {
  id: string;
  user_id: string;
  resume_text: string;
  education_score: number;
  leadership_score: number;
  overall_score: number;
  experience_level: string;
  years_of_experience: number;
  missing_skills: string[];
  suggestions: string[];
  full_analysis: ResumeAnalysisSuccess;
}

export interface HistorySummary {
  total_analyses: number;
  average_overall_score: number;
  average_education_score: number;
  average_leadership_score: number;
  latest_analysis: Date | null;
  score_trend: {
    date: Date;
    overall_score: number;
  }[];
}

// ==================== CRUD OPERATIONS ====================

/**
 * Fetch all analysis history for a user with pagination
 */
export const getUserHistory = async (
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<AnalysisHistoryEntry[]> => {
  const query = `
    SELECT 
      id, 
      user_id, 
      resume_text, 
      education_score,
      leadership_score,
      overall_score,
      experience_level,
      years_of_experience,
      missing_skills, 
      suggestions,
      full_analysis,
      created_at
    FROM analysis_history
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;

  try {
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  } catch (error) {
    console.error("Error fetching user history:", error);
    throw new Error("Failed to fetch analysis history");
  }
};

/**
 * Get total count of user's analyses
 */
export const getUserHistoryCount = async (userId: string): Promise<number> => {
  const query = `
    SELECT COUNT(*) as count
    FROM analysis_history
    WHERE user_id = $1
  `;

  try {
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error("Error counting user history:", error);
    throw new Error("Failed to count analysis history");
  }
};

/**
 * Sanitize text to remove null bytes and invalid UTF-8 sequences
 */
const sanitizeText = (text: string): string => {
  if (!text) return "";

  // Remove null bytes and control characters except newlines and tabs
  return text
    .replace(/\0/g, "") // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters except \t \n \r
    .trim();
};

/**
 * Ensure scores are within valid range (1-10)
 */
const sanitizeScore = (score: number): number => {
  // Ensure score is between 1 and 10, default to 1 if invalid
  if (isNaN(score) || score < 1 || score > 10) {
    return 1;
  }
  return Math.round(score); // Round to nearest integer
};

/**
 * Sanitize overall score (1.0-10.0)
 */
const sanitizeOverallScore = (score: number): number => {
  // Ensure score is between 1.0 and 10.0, default to 1.0 if invalid
  if (isNaN(score) || score < 1.0 || score > 10.0) {
    return 1.0;
  }
  return Math.max(1.0, Math.min(10.0, parseFloat(score.toFixed(1))));
};

/**
 * Sanitize years of experience (integer, >= 0)
 */
const sanitizeYearsOfExperience = (years: unknown): number => {
  const value = Number(years);

  if (Number.isNaN(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
};

/**
 * Create a new analysis history entry
 */
export const createHistoryEntry = async (
  entry: CreateHistoryEntryInput
): Promise<AnalysisHistoryEntry> => {
  const query = `
    INSERT INTO analysis_history (
      id, 
      user_id, 
      resume_text, 
      education_score,
      leadership_score,
      overall_score,
      experience_level,
      years_of_experience,
      missing_skills, 
      suggestions,
      full_analysis
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  // Sanitize data before inserting
  const sanitizedResumeText = sanitizeText(entry.resume_text);
  const sanitizedEducationScore = sanitizeScore(entry.education_score);
  const sanitizedLeadershipScore = sanitizeScore(entry.leadership_score);
  const sanitizedOverallScore = sanitizeOverallScore(entry.overall_score);
  const sanitizedYearsOfExperience = sanitizeYearsOfExperience(
    entry.years_of_experience
  );

  const values = [
    entry.id,
    entry.user_id,
    sanitizedResumeText,
    sanitizedEducationScore,
    sanitizedLeadershipScore,
    sanitizedOverallScore,
    entry.experience_level,
    sanitizedYearsOfExperience,
    JSON.stringify(entry.missing_skills),
    JSON.stringify(entry.suggestions),
    JSON.stringify(entry.full_analysis),
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating history entry:", error);
    throw new Error("Failed to create analysis history");
  }
};

/**
 * Delete an analysis history entry
 */
export const deleteHistoryEntry = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const query = `
    DELETE FROM analysis_history
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;

  try {
    const result = await pool.query(query, [id, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error("Error deleting history entry:", error);
    throw new Error("Failed to delete analysis history");
  }
};

/**
 * Get a single history entry by ID
 */
export const getHistoryEntryById = async (
  id: string,
  userId: string
): Promise<AnalysisHistoryEntry | null> => {
  const query = `
    SELECT 
      id, 
      user_id, 
      resume_text, 
      education_score,
      leadership_score,
      overall_score,
      experience_level,
      years_of_experience,
      missing_skills, 
      suggestions,
      full_analysis,
      created_at
    FROM analysis_history
    WHERE id = $1 AND user_id = $2
  `;

  try {
    const result = await pool.query(query, [id, userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error fetching history entry:", error);
    throw new Error("Failed to fetch analysis history entry");
  }
};

// ==================== ANALYTICS & INSIGHTS ====================

/**
 * Get user's history summary and analytics
 */
export const getUserHistorySummary = async (
  userId: string
): Promise<HistorySummary> => {
  const query = `
    SELECT 
      COUNT(*) as total_analyses,
      AVG(overall_score) as average_overall_score,
      AVG(education_score) as average_education_score,
      AVG(leadership_score) as average_leadership_score,
      MAX(created_at) as latest_analysis
    FROM analysis_history
    WHERE user_id = $1
  `;

  const trendQuery = `
    SELECT 
      created_at::date as date,
      AVG(overall_score) as overall_score
    FROM analysis_history
    WHERE user_id = $1
    GROUP BY created_at::date
    ORDER BY date DESC
    LIMIT 10
  `;

  try {
    const summaryResult = await pool.query(query, [userId]);
    const trendResult = await pool.query(trendQuery, [userId]);

    return {
      total_analyses: parseInt(summaryResult.rows[0].total_analyses, 10),
      average_overall_score: parseFloat(
        summaryResult.rows[0].average_overall_score || 0
      ),
      average_education_score: parseFloat(
        summaryResult.rows[0].average_education_score || 0
      ),
      average_leadership_score: parseFloat(
        summaryResult.rows[0].average_leadership_score || 0
      ),
      latest_analysis: summaryResult.rows[0].latest_analysis,
      score_trend: trendResult.rows.map((row) => ({
        date: row.date,
        overall_score: parseFloat(row.overall_score),
      })),
    };
  } catch (error) {
    console.error("Error fetching user history summary:", error);
    throw new Error("Failed to fetch history summary");
  }
};

/**
 * Get skill gap trends over time
 */
export const getSkillGapTrends = async (
  userId: string
): Promise<{ skill: string; frequency: number }[]> => {
  const query = `
    SELECT 
      skill,
      COUNT(*) as frequency
    FROM analysis_history,
    LATERAL jsonb_array_elements_text(missing_skills) as skill
    WHERE user_id = $1
    GROUP BY skill
    ORDER BY frequency DESC
    LIMIT 10
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows.map((row) => ({
      skill: row.skill,
      frequency: parseInt(row.frequency, 10),
    }));
  } catch (error) {
    console.error("Error fetching skill gap trends:", error);
    throw new Error("Failed to fetch skill gap trends");
  }
};

/**
 * Get experience level progression
 */
export const getExperienceLevelProgression = async (
  userId: string
): Promise<{ date: Date; experience_level: string }[]> => {
  const query = `
    SELECT 
      created_at as date,
      experience_level
    FROM analysis_history
    WHERE user_id = $1
    ORDER BY created_at ASC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error("Error fetching experience level progression:", error);
    throw new Error("Failed to fetch experience progression");
  }
};

/**
 * Compare current analysis with user's historical average
 */
export const compareWithHistoricalAverage = async (
  userId: string,
  currentScores: {
    overall_score: number;
    education_score: number;
    leadership_score: number;
  }
) => {
  const query = `
    SELECT 
      AVG(overall_score) as avg_overall,
      AVG(education_score) as avg_education,
      AVG(leadership_score) as avg_leadership
    FROM analysis_history
    WHERE user_id = $1
  `;

  try {
    const result = await pool.query(query, [userId]);
    const avg = result.rows[0];

    return {
      overall_improvement:
        currentScores.overall_score - parseFloat(avg.avg_overall || 0),
      education_improvement:
        currentScores.education_score - parseFloat(avg.avg_education || 0),
      leadership_improvement:
        currentScores.leadership_score - parseFloat(avg.avg_leadership || 0),
    };
  } catch (error) {
    console.error("Error comparing with historical average:", error);
    throw new Error("Failed to compare with historical data");
  }
};

/**
 * Delete all history for a user (for account deletion/GDPR)
 */
export const deleteAllUserHistory = async (userId: string): Promise<number> => {
  const query = `
    DELETE FROM analysis_history
    WHERE user_id = $1
    RETURNING id
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rowCount || 0;
  } catch (error) {
    console.error("Error deleting all user history:", error);
    throw new Error("Failed to delete user history");
  }
};

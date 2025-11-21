import pool from "../config/database";

export interface AnalysisHistoryEntry {
  id: string;
  user_id: string;
  resume_text: string;
  skills_score: number;
  experience_score: number;
  format_score: number;
  missing_skills: string[];
  suggestions: string[];
  created_at: Date;
}

/**
 * Fetch all analysis history for a user
 */
export const getUserHistory = async (
  userId: string
): Promise<AnalysisHistoryEntry[]> => {
  const query = `
    SELECT 
      id, 
      user_id, 
      resume_text, 
      skills_score, 
      experience_score, 
      format_score, 
      missing_skills, 
      suggestions, 
      created_at
    FROM analysis_history
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error("Error fetching user history:", error);
    throw new Error("Failed to fetch analysis history");
  }
};

/**
 * Create a new analysis history entry
 */
export const createHistoryEntry = async (
  entry: Omit<AnalysisHistoryEntry, "created_at">
): Promise<AnalysisHistoryEntry> => {
  const query = `
    INSERT INTO analysis_history (
      id, 
      user_id, 
      resume_text, 
      skills_score, 
      experience_score, 
      format_score, 
      missing_skills, 
      suggestions
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    entry.id,
    entry.user_id,
    entry.resume_text,
    entry.skills_score,
    entry.experience_score,
    entry.format_score,
    JSON.stringify(entry.missing_skills),
    JSON.stringify(entry.suggestions),
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
      skills_score, 
      experience_score, 
      format_score, 
      missing_skills, 
      suggestions, 
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

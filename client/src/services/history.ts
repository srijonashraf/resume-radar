import { supabase } from "./supabase";
import { AnalysisHistoryEntry } from "../state/useStore";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("Missing API URL");
}

/**
 * Get auth token from Supabase session
 */
const getAuthToken = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Fetch user's analysis history from backend
 */
export const fetchHistory = async (): Promise<AnalysisHistoryEntry[]> => {
  const token = await getAuthToken();
  if (!token) {
    console.error("No auth token available");
    return [];
  }

  try {
    const response = await fetch(`${API_URL}/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Transform backend response to frontend format
    return data.map((row: any) => ({
      id: row.id,
      date: new Date(row.created_at),
      resumeData: {
        file: null,
        rawText: row.resume_text,
      },
      analysisResults: {
        skills: row.skills_score,
        experience: row.experience_score,
        format: row.format_score,
        missingSkills: row.missing_skills || [],
        suggestions: row.suggestions || [],
      },
    }));
  } catch (error) {
    console.error("Error fetching history:", error);
    return [];
  }
};

/**
 * Save analysis history to backend
 */
export const saveHistory = async (entry: AnalysisHistoryEntry) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("No auth token available");
  }

  try {
    const response = await fetch(`${API_URL}/history`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: entry.id,
        resumeText: entry.resumeData.rawText,
        skillsScore: entry.analysisResults.skills,
        experienceScore: entry.analysisResults.experience,
        formatScore: entry.analysisResults.format,
        missingSkills: entry.analysisResults.missingSkills,
        suggestions: entry.analysisResults.suggestions,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error saving history:", error);
    throw error;
  }
};

/**
 * Delete analysis history from backend
 */
export const deleteHistory = async (id: string) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("No auth token available");
  }

  try {
    const response = await fetch(`${API_URL}/history/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting history:", error);
    throw error;
  }
};

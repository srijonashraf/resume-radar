import axios from "axios";
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("Missing API URL");
}

const api = axios.create({
  baseURL: API_URL,
});

// Add Auth Token to every request
api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Health check
export const checkHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

// Check guest status
export const checkGuestStatus = async () => {
  const response = await api.get("/guest-status");
  return response.data;
};

// Resume Analysis - Allows guest users
export const analyzeResume = async (resumeText: string) => {
  const response = await api.post("/analyze", { resumeText });
  return response.data;
};

// Job Match - Requires authentication
export const compareWithJobDescription = async (
  resumeText: string,
  jobDescription: string
) => {
  const response = await api.post("/job-match", { resumeText, jobDescription });
  return response.data;
};

// Career Map - Requires authentication
export const generateCareerMap = async (resumeText: string) => {
  const response = await api.post("/career-map", { resumeText });
  return response.data;
};

// Smart Rewrite - Requires authentication
export const smartRewrite = async (
  originalText: string,
  jobDescription: string
) => {
  const response = await api.post("/rewrite", { originalText, jobDescription });
  return response.data;
};

// Tailor Resume - Requires authentication
export const tailorResume = async (
  resumeText: string,
  jobDescription: string
) => {
  const response = await api.post("/tailor", { resumeText, jobDescription });
  return response.data;
};

// History endpoints - Requires authentication
export const getUserHistory = async (
  limit: number = 50,
  offset: number = 0
) => {
  const response = await api.get(`/history?limit=${limit}&offset=${offset}`);
  return response.data;
};

// Enhanced history functions with data transformation
export const fetchUserHistory = async (
  limit: number = 50,
  offset: number = 0
): Promise<{ data: any[]; pagination: any }> => {
  try {
    const response = await getUserHistory(limit, offset);

    // Transform backend response to frontend format
    const transformedData = response.data.map((row: any) => ({
      id: row.id,
      date: new Date(row.created_at),
      resumeData: {
        file: null,
        rawText: row.resume_text,
      },
      analysisResults: {
        ...row.full_analysis,
        metadata: {
          analyzedAt: row.created_at,
          analysisVersion: "2.0",
        },
      },
    }));

    return {
      data: transformedData,
      pagination: response.pagination,
    };
  } catch (error) {
    console.error("Error fetching history:", error);
    return {
      data: [],
      pagination: { total: 0, limit, offset, hasMore: false },
    };
  }
};

export const getHistoryEntryById = async (id: string) => {
  const response = await api.get(`/history/${id}`);
  return response.data;
};

export const createHistoryEntry = async (entry: {
  id: string;
  resumeText: string;
  analysis: any;
}) => {
  const response = await api.post("/history", entry);
  return response.data;
};

export const deleteHistoryEntry = async (id: string) => {
  const response = await api.delete(`/history/${id}`);
  return response.data;
};

export const deleteAllHistory = async () => {
  const response = await api.delete("/history");
  return response.data;
};

// Analytics endpoints - Requires authentication
export const getHistorySummary = async () => {
  const response = await api.get("/history/summary");
  return response.data;
};

export const getSkillTrends = async () => {
  const response = await api.get("/history/skill-trends");
  return response.data;
};

export const getExperienceProgression = async () => {
  const response = await api.get("/history/progression");
  return response.data;
};

// Enhanced analytics functions with data transformation
export const fetchHistorySummary = async () => {
  try {
    const response = await getHistorySummary();
    return {
      ...response,
      latest_analysis: response.latest_analysis
        ? new Date(response.latest_analysis)
        : null,
      score_trend: response.score_trend.map((trend: any) => ({
        ...trend,
        date: new Date(trend.date),
      })),
    };
  } catch (error) {
    console.error("Error fetching history summary:", error);
    return null;
  }
};

export const fetchSkillTrends = async () => {
  try {
    const response = await getSkillTrends();
    return response.trends;
  } catch (error) {
    console.error("Error fetching skill trends:", error);
    return [];
  }
};

export const fetchExperienceProgression = async () => {
  try {
    const response = await getExperienceProgression();
    return response.progression.map((item: any) => ({
      ...item,
      date: new Date(item.date),
    }));
  } catch (error) {
    console.error("Error fetching experience progression:", error);
    return [];
  }
};

export default api;

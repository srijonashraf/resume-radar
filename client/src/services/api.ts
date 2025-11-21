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

export const analyzeResume = async (resumeText: string) => {
  const response = await api.post("/analyze", { resumeText });
  return response.data;
};

// Check guest status
export const checkGuestStatus = async () => {
  const response = await api.get("/guest-status");
  return response.data;
};

export const generateCareerMap = async (resumeText: string) => {
  const response = await api.post("/career-map", { resumeText });
  return response.data;
};

export const smartRewrite = async (
  originalText: string,
  jobDescription: string
) => {
  const response = await api.post("/rewrite", { originalText, jobDescription });
  return response.data;
};

export const compareWithJobDescription = async (
  resumeText: string,
  jobDescription: string
) => {
  const response = await api.post("/job-match", { resumeText, jobDescription });
  return response.data;
};

export default api;

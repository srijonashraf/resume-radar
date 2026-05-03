import axios from "axios";

import { ApiError } from "./errors";

import type {
  SSEExtractionProgress,
  SSEExtractionCompletePayload,
  SSEComputingMetrics,
  SSEMetricsCompletePayload,
  SSEAnalyzingProgress,
  SSEAnalysisCompletePayload,
} from "../types";

import type {
  JobMatchResult,
  CareerMapResult,
  TailorResult,
} from "../store/useStore";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("Missing API URL");
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem("resumetra_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== Auth ====================

export const googleLogin = async (idToken: string) => {
  const response = await api.post("/auth/google", { idToken });
  return response.data.data as {
    token: string;
    user: {
      id: string;
      email: string | null;
      name: string | null;
      picture: string | null;
    };
  };
};

// ==================== Extraction — SSE Streaming ====================

export const extractResumeStream = async (
  input: { file?: File; text?: string },
  onValidating: () => void,
  onExtracting: (data: SSEExtractionProgress) => void,
): Promise<SSEExtractionCompletePayload> => {
  const token = localStorage.getItem("resumetra_token");

  let response: Response;

  if (input.file) {
    const formData = new FormData();
    formData.append("resume", input.file);

    response = await fetch(`${API_URL}/extract`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
  } else if (input.text) {
    response = await fetch(`${API_URL}/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ resumeText: input.text }),
    });
  } else {
    throw new ApiError(400, "Either file or text must be provided");
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw ApiError.fromResponse(response.status, errorData);
  }

  if (!response.body) {
    throw new ApiError(500, "No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completeResult: SSEExtractionCompletePayload | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const eventBlocks = buffer.split("\n\n");
    buffer = eventBlocks.pop() || "";

    for (const block of eventBlocks) {
      if (!block.trim()) continue;

      let eventType = "";
      let eventData = "";

      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          eventData = line.slice(6);
        }
      }

      if (!eventData) continue;

      const parsed: unknown = JSON.parse(eventData);

      switch (eventType) {
        case "validating":
          onValidating();
          break;
        case "extracting":
          onExtracting(parsed as SSEExtractionProgress);
          break;
        case "complete":
          completeResult = parsed as SSEExtractionCompletePayload;
          break;
        case "error":
          throw ApiError.fromResponse(400, parsed);
      }
    }
  }

  if (!completeResult) {
    throw new ApiError(500, "Stream ended without complete event");
  }

  return completeResult;
};

// ==================== Analysis — SSE Streaming ====================

export interface AnalysisStreamCallbacks {
  onComputingMetrics: (data: SSEComputingMetrics) => void;
  onMetricsComplete: (data: SSEMetricsCompletePayload) => void;
  onAnalyzing: (data: SSEAnalyzingProgress) => void;
}

export const analyzeResumeStream = async (
  analysisId: string,
  jobDescription: string | null,
  callbacks: AnalysisStreamCallbacks,
): Promise<SSEAnalysisCompletePayload> => {
  const token = localStorage.getItem("resumetra_token");

  const response = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      analysisId,
      ...(jobDescription ? { jobDescription } : {}),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw ApiError.fromResponse(response.status, errorData);
  }

  if (!response.body) {
    throw new ApiError(500, "No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completeResult: SSEAnalysisCompletePayload | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const eventBlocks = buffer.split("\n\n");
    buffer = eventBlocks.pop() || "";

    for (const block of eventBlocks) {
      if (!block.trim()) continue;

      let eventType = "";
      let eventData = "";

      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          eventData = line.slice(6);
        }
      }

      if (!eventData) continue;

      const parsed: unknown = JSON.parse(eventData);

      switch (eventType) {
        case "computing_metrics":
          callbacks.onComputingMetrics(parsed as SSEComputingMetrics);
          break;
        case "metrics_complete":
          callbacks.onMetricsComplete(parsed as SSEMetricsCompletePayload);
          break;
        case "analyzing":
          callbacks.onAnalyzing(parsed as SSEAnalyzingProgress);
          break;
        case "complete":
          completeResult = parsed as SSEAnalysisCompletePayload;
          break;
        case "error":
          throw ApiError.fromResponse(400, parsed);
      }
    }
  }

  if (!completeResult) {
    throw new ApiError(500, "Stream ended without complete event");
  }

  return completeResult;
};

// ==================== Job / Career / Tailor (503 until Phase 3) ====================

export const compareWithJobDescription = async (
  analysisId: string,
  jobDescription: string,
): Promise<JobMatchResult> => {
  const response = await api.post("/job-match", { analysisId, jobDescription });
  return response.data.data;
};

export const generateCareerMap = async (
  analysisId: string,
): Promise<{ data: CareerMapResult; cached: boolean }> => {
  const response = await api.post("/career-map", { analysisId });
  return {
    data: response.data.data,
    cached: !!response.data.metadata?.cached,
  };
};

export const tailorResume = async (
  analysisId: string,
  resumeText: string,
  jobDescription: string,
): Promise<TailorResult> => {
  const response = await api.post("/tailor", { analysisId, resumeText, jobDescription });
  return response.data.data;
};

// ==================== Usage ====================

export interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
}

export const fetchUsage = async (): Promise<UsageInfo> => {
  const response = await api.get("/usage");
  return response.data.data;
};

export default api;

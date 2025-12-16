import { create } from "zustand";

export interface ResumeData {
  file: File | null;
  rawText: string;
}

export interface AnalysisResult {
  overallScore: number;
  scores: {
    technicalSkills: number;
    experience: number;
    presentation: number;
    education: number;
    leadership: number;
  };
  experienceLevel: "Entry-Level" | "Junior" | "Mid-Level" | "Senior" | "Lead/Principal" | "Executive";
  yearsOfExperience: number;
  strengthAreas: string[];
  improvementAreas: string[];
  missingSkills: string[];
  redFlags: string[];
  detectedSkills: {
    technical: string[];
    soft: string[];
  };
  keyAchievements: string[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  atsCompatibility: {
    score: number;
    issues: string[];
  };
  hiringRecommendation: "Strong Hire" | "Hire" | "Maybe" | "No Hire" | "Needs More Info";
  summary: string;
  metadata?: {
    analyzedAt: string;
    analysisVersion: string;
  };
  isGuest?: boolean;
  guestId?: string;
  remainingAnalyses?: number;
  message?: string;
}

export interface JobMatchResult {
  matchPercentage: number;
  matchLevel: "Poor" | "Fair" | "Good" | "Excellent";
  missingSkills: {
    critical: string[];
    important: string[];
    nice_to_have: string[];
  };
  presentSkills: {
    exact_matches: string[];
    partial_matches: string[];
    transferable_skills: string[];
  };
  suggestions: {
    priority: "High" | "Medium" | "Low";
    category: string;
    action: string;
  }[];
  keyword_analysis: {
    total_keywords: number;
    matched_keywords: number;
    missing_keywords: string[];
  };
  experience_gap: {
    required_years: number;
    candidate_years: number;
    gap: number;
    assessment: string;
  };
  recommendation: string;
  metadata?: {
    analyzedAt: string;
  };
}

export interface CareerPathStep {
  role: string;
  status: "current" | "future" | "goal";
  skills_needed?: string[];
  timeframe?: string;
  salary_range?: string;
}

export interface CareerPath {
  name: string;
  description: string;
  difficulty: "Low" | "Medium" | "High";
  timeToGoal: string;
  steps: CareerPathStep[];
}

export interface CareerMapResult {
  paths: CareerPath[];
  currentRole: string;
  currentSkills: string[];
  recommendations: string[];
  metadata?: {
    generatedAt: string;
  };
}

export interface RewriteVariation {
  style: "Conservative" | "Balanced" | "Aggressive";
  text: string;
  changes: string[];
  impact: "Low" | "Medium" | "High";
}

export interface SmartRewriteResult {
  original: string;
  variations: RewriteVariation[];
  keywords_matched: string[];
  ats_score: {
    conservative: number;
    balanced: number;
    aggressive: number;
  };
  recommendation: string;
  metadata?: {
    rewrittenAt: string;
  };
}

export interface AnalysisHistoryEntry {
  id: string;
  date: Date;
  resumeData: ResumeData;
  analysisResults: AnalysisResult;
  jobMatchResults?: JobMatchResult;
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

export interface SkillGapTrend {
  skill: string;
  frequency: number;
}

interface StoreState {
  resumeData: ResumeData | null;
  analysisResults: AnalysisResult | null;
  jobMatchResults: JobMatchResult | null;
  analysisHistory: AnalysisHistoryEntry[];
  jobDescription: string;
  isGuest: boolean;
  guestMessage: string | null;
  setResumeData: (data: ResumeData) => void;
  setAnalysisResults: (results: AnalysisResult) => void;
  setJobMatchResults: (results: JobMatchResult) => void;
  setJobDescription: (description: string) => void;
  setAnalysisHistory: (history: AnalysisHistoryEntry[]) => void;
  addAnalysisHistory: (entry: AnalysisHistoryEntry) => void;
  clearCurrentAnalysis: () => void;
  removeFromHistory: (id: string) => void;
  setGuestMode: (isGuest: boolean, message?: string) => void;
}

const useStore = create<StoreState>()((set) => ({
  resumeData: null,
  analysisResults: null,
  jobMatchResults: null,
  analysisHistory: [],
  jobDescription: "",
  isGuest: false,
  guestMessage: null,
  setResumeData: (data) => set({ resumeData: data }),
  setAnalysisResults: (results) => set({ analysisResults: results }),
  setJobMatchResults: (results) => set({ jobMatchResults: results }),
  setJobDescription: (description) => set({ jobDescription: description }),
  setAnalysisHistory: (history) => set({ analysisHistory: history }),
  addAnalysisHistory: (entry) =>
    set((state) => ({
      analysisHistory: [entry, ...state.analysisHistory], // Prepend new entry
    })),
  clearCurrentAnalysis: () =>
    set({
      resumeData: null,
      analysisResults: null,
      jobMatchResults: null,
      jobDescription: "",
      guestMessage: null,
    }),
  removeFromHistory: (id) =>
    set((state) => ({
      analysisHistory: state.analysisHistory.filter((entry) => entry.id !== id),
    })),
  setGuestMode: (isGuest, message) => set({ isGuest, guestMessage: message || null }),
}));

export { useStore };

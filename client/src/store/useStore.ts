import { create } from "zustand";
import type { AnalysisResultV2, Rewrite } from "@resumetra/shared";
import type { HistoryListItem } from "../services/api";

export interface ResumeData {
  file: File | null;
  rawText: string;
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

export interface TailorSection {
  name: string;
  priority: "High" | "Medium" | "Low";
  before: string;
  after: string;
  changes: string[];
  keywords_added: string[];
}

export interface TailorResult {
  sections: TailorSection[];
  overall_strategy: string;
  keywords_to_add: string[];
  keywords_already_present: string[];
  ats_improvement: {
    before_score: number;
    after_score: number;
  };
}

/**
 * Parsed resume data shape used by editor and PDF generation.
 * Will be replaced by extraction-based types in Phase 3.
 */
export interface ParsedResumeData {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  technicalSkills: string[];
  softSkills: string[];
  jobTitles: string[];
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year: string;
  }>;
  workExperiences: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    year: string;
  }>;
}

export type ExtractionPhase =
  | "idle"
  | "validating"
  | "extracting"
  | "complete"
  | "error";

export type AnalysisPhase =
  | "idle"
  | "computing_metrics"
  | "analyzing"
  | "complete"
  | "error";

export type TailorPhase =
  | "idle"
  | "classifying"
  | "tailoring"
  | "complete"
  | "error";

export interface ExtractionResult {
  document: {
    contact: {
      fullName: string | null;
      email: string | null;
      phone: string | null;
      location: string | null;
      linkedin: string | null;
      github: string | null;
      portfolio: string | null;
    };
    sections: Array<{
      id: string;
      type: "experience" | "text" | "list" | "table" | "raw";
      title: string;
      displayOrder: number;
      items: Array<{
        id: string;
        heading?: string;
        subheading?: string;
        dateRange?: string;
        description?: string;
        bullets?: string[];
        items?: string[];
        rows?: Record<string, string>[];
        rawText?: string;
      }>;
    }>;
    detectedProfession: string;
    detectedCareerLevel: string;
  };
  profession: { professionId: string; confidence: number };
  careerLevel: { levelId: string; label: string; totalMonths: number };
  sectionCoverage: {
    required: { name: string; present: boolean }[];
    recommended: { name: string; present: boolean }[];
    optional: { name: string; present: boolean }[];
  };
  analysisId?: string;
}

interface StoreState {
  resumeData: ResumeData | null;
  jobDescription: string;
  usage: { used: number; limit: number; remaining: number } | null;
  setResumeData: (data: ResumeData) => void;
  setJobDescription: (description: string) => void;
  clearCurrentAnalysis: () => void;
  setUsage: (usage: { used: number; limit: number; remaining: number } | null) => void;
  tailorResult: TailorResult | null;
  setTailorResult: (result: TailorResult | null) => void;
  activeEditorTab: string | null;
  setActiveEditorTab: (tab: string | null) => void;
  extractionResult: ExtractionResult | null;
  extractionPhase: ExtractionPhase;
  extractionProgress: { sectionName: string; index: number; total: number } | null;
  extractionConfirmed: boolean;
  setExtractionResult: (result: ExtractionResult | null) => void;
  setExtractionPhase: (phase: ExtractionPhase) => void;
  setExtractionProgress: (progress: { sectionName: string; index: number; total: number } | null) => void;
  setExtractionConfirmed: (confirmed: boolean) => void;
  analysisResult: AnalysisResultV2 | null;
  analysisPhase: AnalysisPhase;
  analysisProgress: { sectionId: string; sectionTitle: string } | null;
  setAnalysisResult: (result: AnalysisResultV2 | null) => void;
  setAnalysisPhase: (phase: AnalysisPhase) => void;
  setAnalysisProgress: (progress: { sectionId: string; sectionTitle: string } | null) => void;
  tailorPhase: TailorPhase;
  tailorProgress: { sectionId: string; sectionTitle: string } | null;
  tailorRewrites: Rewrite[];
  tailorStats: { rewritten: number; reframed: number; missing: number; total: number } | null;
  setTailorPhase: (phase: TailorPhase) => void;
  setTailorProgress: (progress: { sectionId: string; sectionTitle: string } | null) => void;
  addTailorRewrite: (rewrite: Rewrite) => void;
  setTailorRewrites: (rewrites: Rewrite[]) => void;
  setTailorStats: (stats: { rewritten: number; reframed: number; missing: number; total: number } | null) => void;
  acceptTailorRewrite: (rewriteId: string) => void;
  rejectTailorRewrite: (rewriteId: string) => void;
  clearTailorState: () => void;
  // History
  historyList: HistoryListItem[];
  historyTotal: number;
  historyPage: number;
  historyLoading: boolean;
  setHistoryList: (items: HistoryListItem[], total: number, page: number) => void;
  setHistoryLoading: (loading: boolean) => void;
  removeHistoryEntry: (id: string) => void;
}

const useStore = create<StoreState>()((set) => ({
  resumeData: null,
  jobDescription: "",
  usage: null,
  tailorResult: null,
  activeEditorTab: null,
  extractionResult: null,
  extractionPhase: "idle",
  extractionProgress: null,
  extractionConfirmed: false,
  analysisResult: null,
  analysisPhase: "idle" as AnalysisPhase,
  analysisProgress: null,
  tailorPhase: "idle" as TailorPhase,
  tailorProgress: null,
  tailorRewrites: [],
  tailorStats: null,
  historyList: [],
  historyTotal: 0,
  historyPage: 1,
  historyLoading: false,
  setResumeData: (data) => set({ resumeData: data }),
  setJobDescription: (description) => set({ jobDescription: description }),
  clearCurrentAnalysis: () =>
    set({
      resumeData: null,
      jobDescription: "",
      tailorResult: null,
      activeEditorTab: null,
      extractionResult: null,
      extractionPhase: "idle",
      extractionProgress: null,
      extractionConfirmed: false,
      analysisResult: null,
      analysisPhase: "idle",
      analysisProgress: null,
      tailorPhase: "idle",
      tailorProgress: null,
      tailorRewrites: [],
      tailorStats: null,
    }),
  setUsage: (usage) => set({ usage }),
  setTailorResult: (result) => set({ tailorResult: result }),
  setActiveEditorTab: (tab) => set({ activeEditorTab: tab }),
  setExtractionResult: (result) => set({ extractionResult: result }),
  setExtractionPhase: (phase) => set({ extractionPhase: phase }),
  setExtractionProgress: (progress) => set({ extractionProgress: progress }),
  setExtractionConfirmed: (confirmed) => set({ extractionConfirmed: confirmed }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setAnalysisPhase: (phase) => set({ analysisPhase: phase }),
  setAnalysisProgress: (progress) => set({ analysisProgress: progress }),
  setTailorPhase: (phase) => set({ tailorPhase: phase }),
  setTailorProgress: (progress) => set({ tailorProgress: progress }),
  addTailorRewrite: (rewrite) =>
    set((state) => ({ tailorRewrites: [...state.tailorRewrites, rewrite] })),
  setTailorRewrites: (rewrites) => set({ tailorRewrites: rewrites }),
  setTailorStats: (stats) => set({ tailorStats: stats }),
  acceptTailorRewrite: (rewriteId) =>
    set((state) => ({
      tailorRewrites: state.tailorRewrites.map((r) =>
        r.id === rewriteId ? { ...r, accepted: true } : r,
      ),
    })),
  rejectTailorRewrite: (rewriteId) =>
    set((state) => ({
      tailorRewrites: state.tailorRewrites.map((r) =>
        r.id === rewriteId ? { ...r, accepted: false } : r,
      ),
    })),
  clearTailorState: () =>
    set({
      tailorPhase: "idle",
      tailorProgress: null,
      tailorRewrites: [],
      tailorStats: null,
    }),
  setHistoryList: (items, total, page) =>
    set({ historyList: items, historyTotal: total, historyPage: page }),
  setHistoryLoading: (loading) => set({ historyLoading: loading }),
  removeHistoryEntry: (id) =>
    set((state) => ({
      historyList: state.historyList.filter((item) => item.id !== id),
      historyTotal: Math.max(0, state.historyTotal - 1),
    })),
}));

export { useStore };

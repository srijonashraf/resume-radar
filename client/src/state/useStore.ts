import { create } from "zustand";

export interface ResumeData {
  file: File | null;
  rawText: string;
}

export interface AnalysisResult {
  skills: number;
  experience: number;
  format: number;
  suggestions: string[];
  missingSkills: string[];
}

export interface JobMatchResult {
  matchPercentage: number;
  missingSkills: string[];
  suggestions: string[];
}

export interface AnalysisHistoryEntry {
  id: string;
  date: Date;
  resumeData: ResumeData;
  analysisResults: AnalysisResult;
  jobMatchResults?: JobMatchResult;
}

interface StoreState {
  resumeData: ResumeData | null;
  analysisResults: AnalysisResult | null;
  jobMatchResults: JobMatchResult | null;
  analysisHistory: AnalysisHistoryEntry[];
  jobDescription: string;
  setResumeData: (data: ResumeData) => void;
  setAnalysisResults: (results: AnalysisResult) => void;
  setJobMatchResults: (results: JobMatchResult) => void;
  setJobDescription: (description: string) => void;
  setAnalysisHistory: (history: AnalysisHistoryEntry[]) => void;
  addAnalysisHistory: (entry: AnalysisHistoryEntry) => void;
  clearCurrentAnalysis: () => void;
  removeFromHistory: (id: string) => void;
}

const useStore = create<StoreState>()((set) => ({
  resumeData: null,
  analysisResults: null,
  jobMatchResults: null,
  analysisHistory: [],
  jobDescription: "",
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
    }),
  removeFromHistory: (id) =>
    set((state) => ({
      analysisHistory: state.analysisHistory.filter((entry) => entry.id !== id),
    })),
}));

export { useStore };

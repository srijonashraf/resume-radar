/**
 * Backend response DTOs — typed boundary between API responses and frontend types.
 * SSE extraction events use camelCase.
 */

// ==================== Analysis SSE Payloads ====================

export interface SSEComputingMetrics {
  message: string;
}

export interface SSEMetricsCompletePayload {
  metrics: {
    wordCount: number;
    bulletCount: number;
    avgBulletWordCount: number;
    sectionsPresent: string[];
    sectionsMissing: string[];
    bulletsWithActionVerb: number;
    bulletsWithMetric: number;
    formattingIssues: Array<{
      type: string;
      severity: "high" | "medium" | "low";
      description: string;
      location?: string;
    }>;
    careerLevelDetected: string;
    totalExperienceMonths: number;
    perSection: Array<{
      sectionId: string;
      title: string;
      wordCount: number;
      bulletCount: number;
      avgBulletWordCount: number;
      bulletsWithActionVerb: number;
      bulletsWithMetric: number;
    }>;
    keywordFrequency: Record<string, number>;
  };
}

export interface SSEAnalyzingProgress {
  sectionId: string;
  sectionTitle: string;
}

import type { AnalysisResultV2, Rewrite } from "@resumetra/shared";

export type SSEAnalysisCompletePayload = AnalysisResultV2;

export interface SSEAnalysisError {
  error: string;
}

// ==================== Tailoring SSE Payloads ====================

export interface SSETailoringStart {
  message: string;
}

export interface SSETailoringSection {
  sectionId: string;
  sectionTitle: string;
}

export type SSETailoringRewrite = Rewrite;

export interface SSETailoringComplete {
  rewrites: Rewrite[];
  stats: {
    rewritten: number;
    reframed: number;
    missing: number;
    total: number;
  };
}

// ==================== Extraction SSE Payloads ====================

export interface SSEExtractionProgress {
  sectionName: string;
  index: number;
  total: number;
}

export interface SSEExtractionSectionCoverage {
  required: { name: string; present: boolean }[];
  recommended: { name: string; present: boolean }[];
  optional: { name: string; present: boolean }[];
}

export interface SSEExtractionCompletePayload {
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
  sectionCoverage: SSEExtractionSectionCoverage;
  analysisId?: string;
}

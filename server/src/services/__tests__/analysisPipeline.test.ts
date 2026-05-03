import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ResumeDocument, DynamicSection } from "@resumetra/shared";
import type { MetricsOutput } from "../../stages/stage2_metrics.js";
import type { ProfessionKnowledgeBase } from "../../knowledge/types.js";

const {
  mockLoadAnalysisDocument,
  mockDetectProfession,
  mockDetectCareerLevel,
  mockComputeDeterministicMetrics,
  mockComputeAtsFormattingScore,
  mockComputeKeywordMatchScore,
  mockRunAnalysisAgent,
  mockSaveAnalysisResults,
  mockCallTool,
} = vi.hoisted(() => ({
  mockLoadAnalysisDocument: vi.fn(),
  mockDetectProfession: vi.fn(),
  mockDetectCareerLevel: vi.fn(),
  mockComputeDeterministicMetrics: vi.fn(),
  mockComputeAtsFormattingScore: vi.fn(),
  mockComputeKeywordMatchScore: vi.fn(),
  mockRunAnalysisAgent: vi.fn(),
  mockSaveAnalysisResults: vi.fn(),
  mockCallTool: vi.fn(),
}));

vi.mock("../../db/sections.js", () => ({
  loadAnalysisDocument: mockLoadAnalysisDocument,
  saveAnalysisResults: mockSaveAnalysisResults,
}));

vi.mock("../../stages/detectProfession.js", () => ({
  detectProfession: mockDetectProfession,
}));

vi.mock("../../stages/detectCareerLevel.js", () => ({
  detectCareerLevel: mockDetectCareerLevel,
}));

vi.mock("../../stages/stage2_metrics.js", () => ({
  computeDeterministicMetrics: mockComputeDeterministicMetrics,
}));

vi.mock("../../stages/atsScoring.js", () => ({
  computeAtsFormattingScore: mockComputeAtsFormattingScore,
  computeKeywordMatchScore: mockComputeKeywordMatchScore,
}));

vi.mock("../../stages/stage3_analysis.js", () => ({
  runAnalysisAgent: mockRunAnalysisAgent,
}));

vi.mock("../../services/aiService.js", () => ({
  callTool: mockCallTool,
}));

vi.mock("../../db/rewrites.js", () => ({
  saveRewrites: vi.fn(),
}));

vi.mock("../../stages/stage4_tailoring.js", () => ({
  runTailorAgent: vi.fn(),
}));

import { runAnalysisPipeline } from "../../services/pipelineService.js";

// ── Fixtures ─────────────────────────────────────────────────

const MOCK_SECTIONS: DynamicSection[] = [
  {
    id: "section-0",
    type: "experience",
    title: "Experience",
    displayOrder: 0,
    items: [
      {
        id: "item-0-0",
        heading: "Google",
        subheading: "Software Engineer",
        dateRange: "2020 – 2023",
        bullets: ["Led team of 5 engineers"],
      },
    ],
  },
  {
    id: "section-1",
    type: "list",
    title: "Skills",
    displayOrder: 1,
    items: [{ id: "item-1-0", items: ["Python", "Go"] }],
  },
];

const MOCK_DOCUMENT: ResumeDocument = {
  contact: {
    fullName: "John Doe",
    email: "john@example.com",
    phone: null,
    location: null,
    linkedin: null,
    github: null,
    portfolio: null,
  },
  sections: MOCK_SECTIONS,
  detectedProfession: "software_engineer",
  detectedCareerLevel: "mid",
};

const MOCK_METRICS: MetricsOutput = {
  wordCount: 300,
  bulletCount: 8,
  avgBulletWordCount: 12,
  sectionsPresent: ["experience", "skills"],
  sectionsMissing: [],
  bulletsWithActionVerb: 6,
  bulletsWithMetric: 3,
  formattingIssues: [],
  careerLevelDetected: "mid",
  totalExperienceMonths: 36,
  perSection: [
    {
      sectionId: "section-0",
      title: "Experience",
      wordCount: 200,
      bulletCount: 6,
      avgBulletWordCount: 14,
      bulletsWithActionVerb: 5,
      bulletsWithMetric: 2,
    },
  ],
  keywordFrequency: { python: 3, go: 2 },
};

// ── Tests ────────────────────────────────────────────────────

describe("runAnalysisPipeline", () => {
  const sseEvents: Array<{ event: string; data: unknown }> = [];
  const sendSSE = (event: string, data: unknown) => {
    sseEvents.push({ event, data });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sseEvents.length = 0;

    // Default happy path
    mockLoadAnalysisDocument.mockResolvedValue({
      document: MOCK_DOCUMENT,
      userId: "user-123",
    });
    mockDetectProfession.mockReturnValue({
      professionId: "software_engineer",
      confidence: 0.85,
    });
    mockDetectCareerLevel.mockReturnValue({
      levelId: "mid",
      label: "Mid-Level",
      totalMonths: 36,
    });
    mockComputeDeterministicMetrics.mockReturnValue(MOCK_METRICS);
    mockComputeAtsFormattingScore.mockReturnValue({
      score: 100,
      issues: [],
    });
    mockRunAnalysisAgent.mockResolvedValue({
      sectionScores: [
        {
          sectionId: "section-0",
          contentScore: 7,
          impactScore: 6,
          issues: [],
        },
      ],
      readability: { score: 7.5, issues: [] },
    });
    mockSaveAnalysisResults.mockResolvedValue(undefined);
  });

  it("runs full pipeline without JD and sends correct SSE events", async () => {
    const result = await runAnalysisPipeline(
      { analysisId: "analysis-123" },
      sendSSE,
    );

    // Verify orchestration order
    expect(mockLoadAnalysisDocument).toHaveBeenCalledWith("analysis-123");
    expect(mockDetectProfession).toHaveBeenCalledWith(MOCK_SECTIONS);
    expect(mockComputeDeterministicMetrics).toHaveBeenCalled();
    expect(mockRunAnalysisAgent).toHaveBeenCalled();
    expect(mockSaveAnalysisResults).toHaveBeenCalled();

    // Verify SSE events
    expect(sseEvents[0].event).toBe("computing_metrics");
    expect(sseEvents.find((e) => e.event === "metrics_complete")).toBeDefined();
    expect(sseEvents.find((e) => e.event === "complete")).toBeDefined();

    // Verify result shape
    expect(result.deterministicMetrics).toEqual(MOCK_METRICS);
    expect(result.atsReport).toBeNull();
    expect(result.sectionScores).toHaveLength(1);
    expect(result.readability.score).toBe(7.5);
  });

  it("runs ATS scoring when jobDescription is provided", async () => {
    mockCallTool.mockResolvedValue({
      data: {
        skills: ["python"],
        tools: ["docker"],
        requirements: ["5 years experience"],
        softSkills: ["leadership"],
      },
    });
    mockComputeKeywordMatchScore.mockReturnValue({
      exactMatchScore: 50,
      partialMatchScore: 0,
      sectionCoverageScore: 100,
      matchedKeywords: ["python"],
      missingKeywords: ["java"],
      partialMatches: [],
      overallAtsScore: 75,
    });

    const result = await runAnalysisPipeline(
      { analysisId: "analysis-123", jobDescription: "Looking for Python developer with Java" },
      sendSSE,
    );

    expect(mockCallTool).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      "extract_jd_keywords",
      expect.anything(),
    );
    expect(mockComputeKeywordMatchScore).toHaveBeenCalled();
    expect(result.atsReport).not.toBeNull();
    expect(result.atsReport!.matchScore).toBe(75);
  });

  it("skips ATS when JD keyword extraction fails", async () => {
    mockCallTool.mockRejectedValue(new Error("AI timeout"));

    const result = await runAnalysisPipeline(
      { analysisId: "analysis-123", jobDescription: "Some JD text" },
      sendSSE,
    );

    // Should complete without ATS report
    expect(result.atsReport).toBeNull();
    expect(sseEvents.find((e) => e.event === "complete")).toBeDefined();
  });

  it("persists analysis results with correct shape", async () => {
    await runAnalysisPipeline(
      { analysisId: "analysis-123" },
      sendSSE,
    );

    expect(mockSaveAnalysisResults).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisId: "analysis-123",
        sectionScores: expect.any(Array),
        atsReport: null,
      }),
    );
  });

  it("throws when analysis not found in DB", async () => {
    mockLoadAnalysisDocument.mockResolvedValue(null);

    await expect(
      runAnalysisPipeline({ analysisId: "nonexistent" }, sendSSE),
    ).rejects.toThrow("Analysis not found");
  });

  it("continues on persistence failure (graceful degradation)", async () => {
    mockSaveAnalysisResults.mockRejectedValue(new Error("DB write failed"));

    const result = await runAnalysisPipeline(
      { analysisId: "analysis-123" },
      sendSSE,
    );

    // Should still return results even if persist fails
    expect(result.sectionScores).toHaveLength(1);
    expect(sseEvents.find((e) => e.event === "complete")).toBeDefined();
  });
});

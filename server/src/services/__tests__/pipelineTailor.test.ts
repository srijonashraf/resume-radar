import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ResumeDocument, DynamicSection, AnalysisResultV2 } from "@resumetra/shared";

const { mockCallTool, mockLoadDocument, mockLoadAnalysis, mockSaveRewrites } = vi.hoisted(() => ({
  mockCallTool: vi.fn(),
  mockLoadDocument: vi.fn(),
  mockLoadAnalysis: vi.fn(),
  mockSaveRewrites: vi.fn(),
}));

vi.mock("../aiService.js", () => ({
  callTool: mockCallTool,
}));

vi.mock("../../db/sections.js", () => ({
  loadAnalysisDocument: mockLoadDocument,
  loadAnalysisResults: mockLoadAnalysis,
  saveSections: vi.fn(),
  saveAnalysisResults: vi.fn(),
}));

vi.mock("../../db/rewrites.js", () => ({
  saveRewrites: mockSaveRewrites,
}));

vi.mock("../../stages/stage4_tailoring.js", () => ({
  runTailorAgent: vi.fn().mockResolvedValue([
    {
      id: "uuid-1",
      sectionId: "section-0",
      itemId: "item-0-0",
      field: "bullet",
      before: "Helped",
      after: "Led",
      rationale: "Stronger verb",
      keywordsAdded: ["leadership"],
      gapClassification: "REWRITTEN",
      accepted: null,
    },
  ]),
}));

import { runTailorPipeline } from "../pipelineService.js";

// ── Helpers ──────────────────────────────────────────────────

function makeDoc(): ResumeDocument {
  return {
    contact: {
      fullName: "John", email: "j@test.com", phone: null,
      location: null, linkedin: null, github: null, portfolio: null,
    },
    sections: [{
      id: "section-0",
      type: "experience",
      title: "Experience",
      displayOrder: 0,
      items: [{
        id: "item-0-0",
        heading: "Engineer at Acme",
        bullets: ["Helped with project"],
      }],
    }],
    detectedProfession: "software_engineer",
    detectedCareerLevel: "mid",
  };
}

function makeAnalysisResult(): AnalysisResultV2 {
  return {
    deterministicMetrics: {
      wordCount: 100, bulletCount: 3, avgBulletWordCount: 10,
      sectionsPresent: ["experience"], sectionsMissing: [],
      bulletsWithActionVerb: 1, bulletsWithMetric: 0,
      formattingIssues: [], careerLevelDetected: "mid",
      totalExperienceMonths: 24,
    },
    sectionMetrics: [],
    sectionScores: [{
      sectionId: "section-0",
      contentScore: 5,
      impactScore: 4,
      issues: [{
        itemId: "item-0-0",
        type: "weak_bullet",
        severity: "medium",
        description: "Weak verb",
        suggestion: "Use stronger verb",
      }],
    }],
    readability: { score: 7, issues: [] },
    atsReport: {
      matchScore: 65,
      resumeKeywords: ["python"],
      jdKeywords: ["python", "kubernetes"],
      matchedKeywords: ["python"],
      missingKeywords: ["kubernetes"],
      partialMatches: [],
      sectionCoverage: { experience: true },
    },
    keywordFrequency: {},
  };
}

// ── Tests ────────────────────────────────────────────────────

describe("runTailorPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads document, loads analysis, runs tailor agent, persists rewrites", async () => {
    const doc = makeDoc();
    const analysis = makeAnalysisResult();

    mockLoadDocument.mockResolvedValueOnce({ document: doc, userId: "user-1" });
    mockLoadAnalysis.mockResolvedValueOnce(analysis);
    mockSaveRewrites.mockResolvedValueOnce(undefined);

    const sseEvents: Array<{ event: string; data: unknown }> = [];
    const sendSSE = (event: string, data: unknown) => {
      sseEvents.push({ event, data });
    };

    const result = await runTailorPipeline(
      { analysisId: "analysis-1", jobDescription: "Senior Engineer with Kubernetes" },
      sendSSE,
    );

    // Should have loaded document and analysis
    expect(mockLoadDocument).toHaveBeenCalledWith("analysis-1");
    expect(mockLoadAnalysis).toHaveBeenCalledWith("analysis-1");

    // Should have persisted rewrites
    expect(mockSaveRewrites).toHaveBeenCalledWith({
      analysisId: "analysis-1",
      rewrites: expect.arrayContaining([
        expect.objectContaining({ gapClassification: "REWRITTEN" }),
      ]),
    });

    // Should emit tailoring_complete SSE event
    const completeEvents = sseEvents.filter((e) => e.event === "tailoring_complete");
    expect(completeEvents).toHaveLength(1);
    expect(completeEvents[0].data).toHaveProperty("rewrites");
    expect(completeEvents[0].data).toHaveProperty("stats");
  });

  it("throws when analysis not found", async () => {
    mockLoadDocument.mockResolvedValueOnce(null);

    const sendSSE = vi.fn();

    await expect(
      runTailorPipeline(
        { analysisId: "nonexistent", jobDescription: "job" },
        sendSSE,
      ),
    ).rejects.toThrow("Analysis not found");
  });

  it("throws when analysis results not found", async () => {
    const doc = makeDoc();
    mockLoadDocument.mockResolvedValueOnce({ document: doc, userId: "user-1" });
    mockLoadAnalysis.mockResolvedValueOnce(null);

    const sendSSE = vi.fn();

    await expect(
      runTailorPipeline(
        { analysisId: "analysis-1", jobDescription: "job" },
        sendSSE,
      ),
    ).rejects.toThrow("Analysis results not found");
  });

  it("emits tailoring_start SSE event", async () => {
    const doc = makeDoc();
    const analysis = makeAnalysisResult();

    mockLoadDocument.mockResolvedValueOnce({ document: doc, userId: "user-1" });
    mockLoadAnalysis.mockResolvedValueOnce(analysis);
    mockSaveRewrites.mockResolvedValueOnce(undefined);

    const sseEvents: Array<{ event: string; data: unknown }> = [];
    const sendSSE = (event: string, data: unknown) => {
      sseEvents.push({ event, data });
    };

    await runTailorPipeline(
      { analysisId: "analysis-1", jobDescription: "job" },
      sendSSE,
    );

    expect(sseEvents[0].event).toBe("tailoring_start");
  });

  it("still returns rewrites even when persistence fails", async () => {
    const doc = makeDoc();
    const analysis = makeAnalysisResult();

    mockLoadDocument.mockResolvedValueOnce({ document: doc, userId: "user-1" });
    mockLoadAnalysis.mockResolvedValueOnce(analysis);
    mockSaveRewrites.mockRejectedValueOnce(new Error("DB error"));

    const sendSSE = vi.fn();

    // Should not throw — graceful handling
    const result = await runTailorPipeline(
      { analysisId: "analysis-1", jobDescription: "job" },
      sendSSE,
    );

    expect(result.rewrites).toHaveLength(1);
  });
});

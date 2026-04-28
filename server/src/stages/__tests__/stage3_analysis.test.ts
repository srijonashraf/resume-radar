import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ResumeDocument, DynamicSection } from "@resumetra/shared";
import type { ProfessionKnowledgeBase } from "../../knowledge/types.js";
import type { MetricsOutput } from "../stage2_metrics.js";

const { mockCallTool } = vi.hoisted(() => ({
  mockCallTool: vi.fn(),
}));

vi.mock("../../services/aiService.js", () => ({
  callTool: mockCallTool,
}));

import { runAnalysisAgent } from "../stage3_analysis.js";
import {
  scoreSectionResponseSchema,
  flagIssueResponseSchema,
  assessReadabilityResponseSchema,
} from "../analysisTools.js";

// ── Helpers ──────────────────────────────────────────────────

function makeDoc(sections: DynamicSection[]): ResumeDocument {
  return {
    contact: {
      fullName: "John Doe",
      email: "john@test.com",
      phone: null,
      location: null,
      linkedin: null,
      github: null,
      portfolio: null,
    },
    sections,
    detectedProfession: "generic",
    detectedCareerLevel: "mid",
  };
}

function makeSection(
  overrides: Partial<DynamicSection>,
): DynamicSection {
  return {
    id: overrides.id ?? "section-0",
    type: overrides.type ?? "experience",
    title: overrides.title ?? "Experience",
    displayOrder: overrides.displayOrder ?? 0,
    items: overrides.items ?? [],
  };
}

function makeMetrics(overrides: Partial<MetricsOutput> = {}): MetricsOutput {
  return {
    wordCount: 300,
    bulletCount: 8,
    avgBulletWordCount: 12,
    sectionsPresent: ["experience"],
    sectionsMissing: [],
    bulletsWithActionVerb: 6,
    bulletsWithMetric: 3,
    formattingIssues: [],
    careerLevelDetected: "mid",
    totalExperienceMonths: 36,
    perSection: [],
    keywordFrequency: {},
    ...overrides,
  };
}

const minimalKB: ProfessionKnowledgeBase = {
  professionId: "generic",
  displayName: "General Professional",
  aliases: [],
  careerLevels: [],
  sectionStandards: {},
  atsRules: [],
  actionVerbs: { strong: [], weak: [] },
  metricPatterns: [],
  redFlags: [],
  skillCategories: {},
  keyRecruiterSignals: [],
  commonJobTitles: [],
  commonKeywords: [],
  learningResources: {},
};

// ── Tests ────────────────────────────────────────────────────

describe("runAnalysisAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls score_section for each section and assess_readability at the end", async () => {
    const doc = makeDoc([
      makeSection({ id: "section-0", title: "Experience" }),
      makeSection({ id: "section-1", title: "Skills" }),
    ]);
    const metrics = makeMetrics();
    const sseEvents: Array<{ event: string; data: unknown }> = [];
    const sendSSE = (event: string, data: unknown) => {
      sseEvents.push({ event, data });
    };

    // Mock score_section for section-0
    mockCallTool.mockResolvedValueOnce({
      data: { sectionId: "section-0", contentScore: 7, impactScore: 6 },
    });
    // Mock score_section for section-1
    mockCallTool.mockResolvedValueOnce({
      data: { sectionId: "section-1", contentScore: 8, impactScore: 8 },
    });
    // Mock assess_readability
    mockCallTool.mockResolvedValueOnce({
      data: { score: 7.5, issues: [] },
    });

    const result = await runAnalysisAgent(doc, metrics, minimalKB, sendSSE);

    // Should call score_section twice + assess_readability once
    expect(mockCallTool).toHaveBeenCalledTimes(3);

    // Check tool names called
    expect(mockCallTool.mock.calls[0][2]).toBe("score_section");
    expect(mockCallTool.mock.calls[1][2]).toBe("score_section");
    expect(mockCallTool.mock.calls[2][2]).toBe("assess_readability");

    // Check SSE events
    expect(sseEvents.filter((e) => e.event === "analyzing")).toHaveLength(2);

    // Check results
    expect(result.sectionScores).toHaveLength(2);
    expect(result.sectionScores[0].sectionId).toBe("section-0");
    expect(result.sectionScores[0].contentScore).toBe(7);
    expect(result.readability.score).toBe(7.5);
  });

  it("collects issues from flag_issue calls", async () => {
    const doc = makeDoc([
      makeSection({ id: "section-0", title: "Experience" }),
    ]);
    const metrics = makeMetrics();
    const sendSSE = vi.fn();

    // Mock score_section with low scores (triggers flag_issue)
    mockCallTool.mockResolvedValueOnce({
      data: { sectionId: "section-0", contentScore: 3, impactScore: 2 },
    });
    // Mock flag_issue
    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-0",
        itemId: null,
        type: "weak_content",
        severity: "high",
        description: "Section lacks detail",
        suggestion: "Add more specific achievements",
      },
    });
    // Mock assess_readability
    mockCallTool.mockResolvedValueOnce({
      data: { score: 5, issues: [] },
    });

    const result = await runAnalysisAgent(doc, metrics, minimalKB, sendSSE);

    expect(result.sectionScores[0].issues).toHaveLength(1);
    expect(result.sectionScores[0].issues[0].type).toBe("weak_content");
  });

  it("handles empty document with no sections", async () => {
    const doc = makeDoc([]);
    const metrics = makeMetrics();
    const sendSSE = vi.fn();

    // Only assess_readability called (no sections to score)
    mockCallTool.mockResolvedValueOnce({
      data: { score: 10, issues: [] },
    });

    const result = await runAnalysisAgent(doc, metrics, minimalKB, sendSSE);

    expect(mockCallTool).toHaveBeenCalledTimes(1);
    expect(mockCallTool.mock.calls[0][2]).toBe("assess_readability");
    expect(result.sectionScores).toHaveLength(0);
    expect(result.readability.score).toBe(10);
  });

  it("continues on section scoring failure (graceful degradation)", async () => {
    const doc = makeDoc([
      makeSection({ id: "section-0", title: "Experience" }),
      makeSection({ id: "section-1", title: "Skills" }),
    ]);
    const metrics = makeMetrics();
    const sendSSE = vi.fn();

    // First section succeeds
    mockCallTool.mockResolvedValueOnce({
      data: { sectionId: "section-0", contentScore: 7, impactScore: 6 },
    });
    // Second section fails
    mockCallTool.mockRejectedValueOnce(new Error("AI timeout"));
    // assess_readability succeeds
    mockCallTool.mockResolvedValueOnce({
      data: { score: 6, issues: [] },
    });

    const result = await runAnalysisAgent(doc, metrics, minimalKB, sendSSE);

    // Should still have results for successful section + readability
    expect(result.sectionScores).toHaveLength(1);
    expect(result.sectionScores[0].sectionId).toBe("section-0");
    expect(result.readability.score).toBe(6);
  });

  it("includes metrics context in the prompt", async () => {
    const doc = makeDoc([
      makeSection({ id: "section-0", title: "Experience" }),
    ]);
    const metrics = makeMetrics({ bulletCount: 8, wordCount: 300 });
    const sendSSE = vi.fn();

    mockCallTool.mockResolvedValueOnce({
      data: { sectionId: "section-0", contentScore: 7, impactScore: 6 },
    });
    mockCallTool.mockResolvedValueOnce({
      data: { score: 7, issues: [] },
    });

    await runAnalysisAgent(doc, metrics, minimalKB, sendSSE);

    // Check that the messages include metrics context
    const firstCallMessages = mockCallTool.mock.calls[0][0];
    const systemMsg = firstCallMessages.find(
      (m: { role: string }) => m.role === "system",
    );
    expect(systemMsg).toBeDefined();
    expect(systemMsg.content).toContain("300");
  });
});

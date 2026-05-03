import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  ResumeDocument,
  DynamicSection,
  AnalysisResultV2,
  AtsReport,
} from "@resumetra/shared";
import type { ProfessionKnowledgeBase } from "../../knowledge/types.js";

const { mockCallTool } = vi.hoisted(() => ({
  mockCallTool: vi.fn(),
}));

vi.mock("../../services/aiService.js", () => ({
  callTool: mockCallTool,
}));

import { runTailorAgent } from "../stage4_tailoring.js";

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
    detectedProfession: "software_engineer",
    detectedCareerLevel: "mid",
  };
}

function makeSection(overrides: Partial<DynamicSection> = {}): DynamicSection {
  return {
    id: overrides.id ?? "section-0",
    type: overrides.type ?? "experience",
    title: overrides.title ?? "Experience",
    displayOrder: overrides.displayOrder ?? 0,
    items: overrides.items ?? [
      {
        id: "item-0-0",
        heading: "Software Engineer at Acme",
        dateRange: "2022 - Present",
        bullets: [
          "Helped with project delivery",
          "Used Python for data processing",
        ],
      },
    ],
  };
}

function makeAnalysisResult(
  overrides: Partial<AnalysisResultV2> = {},
): AnalysisResultV2 {
  return {
    deterministicMetrics: {
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
    },
    sectionMetrics: [],
    sectionScores: [
      {
        sectionId: "section-0",
        contentScore: 5,
        impactScore: 4,
        issues: [
          {
            itemId: "item-0-0",
            type: "weak_bullet",
            severity: "medium",
            description: "Weak action verb",
            suggestion: "Use stronger verb",
          },
        ],
      },
    ],
    readability: { score: 7, issues: [] },
    atsReport: {
      matchScore: 65,
      resumeKeywords: ["python"],
      jdKeywords: ["python", "kubernetes", "docker"],
      matchedKeywords: ["python"],
      missingKeywords: ["kubernetes", "docker"],
      partialMatches: [],
      sectionCoverage: { experience: true },
    },
    keywordFrequency: {},
    ...overrides,
  };
}

const minimalKB: ProfessionKnowledgeBase = {
  professionId: "software_engineer",
  displayName: "Software Engineer",
  aliases: [],
  careerLevels: [],
  sectionStandards: {},
  atsRules: [],
  actionVerbs: { strong: ["Led", "Spearheaded"], weak: ["Helped"] },
  metricPatterns: [],
  redFlags: [],
  skillCategories: {},
  keyRecruiterSignals: [],
  commonJobTitles: [],
  commonKeywords: [],
  learningResources: {
    kubernetes: {
      courses: ["Kubernetes Fundamentals"],
      projects: ["Deploy a microservices app"],
      timeline: "2-3 months",
      resumeBulletExample: "Deployed microservices using Kubernetes",
    },
  },
};

// ── Tests ────────────────────────────────────────────────────

describe("runTailorAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls classify_skills once then rewrite_bullet per flagged item", async () => {
    const doc = makeDoc([makeSection()]);
    const analysis = makeAnalysisResult();
    const jdText = "Senior Software Engineer with Kubernetes experience";
    const sseEvents: Array<{ event: string; data: unknown }> = [];
    const sendSSE = (event: string, data: unknown) => {
      sseEvents.push({ event, data });
    };

    // Mock classify_skills
    mockCallTool.mockResolvedValueOnce({
      data: {
        classifications: [
          { skill: "python", classification: "HAS", evidence: "Used in projects" },
          { skill: "kubernetes", classification: "LACKS", evidence: "Not mentioned" },
        ],
      },
    });

    // Mock rewrite_bullet for the flagged item
    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-0",
        itemId: "item-0-0",
        field: "bullet",
        before: "Helped with project delivery",
        after: "Led cross-functional project delivery across 3 teams",
        rationale: "Stronger action verb with quantification",
        keywordsAdded: ["leadership"],
        gapClassification: "REWRITTEN",
      },
    });

    const result = await runTailorAgent(
      doc,
      analysis.atsReport!,
      analysis,
      jdText,
      minimalKB,
      sendSSE,
    );

    // classify_skills called once, rewrite_bullet called once
    expect(mockCallTool).toHaveBeenCalledTimes(2);
    expect(mockCallTool.mock.calls[0][2]).toBe("classify_skills");
    expect(mockCallTool.mock.calls[1][2]).toBe("rewrite_bullet");

    // Result has correct shape
    expect(result).toHaveLength(1);
    expect(result[0].sectionId).toBe("section-0");
    expect(result[0].gapClassification).toBe("REWRITTEN");
    expect(result[0].accepted).toBeNull();
    expect(result[0].id).toBeTruthy(); // UUID assigned
  });

  it("emits SSE events in correct order", async () => {
    const doc = makeDoc([makeSection()]);
    const analysis = makeAnalysisResult();
    const jdText = "Senior Software Engineer";
    const sseEvents: Array<{ event: string; data: unknown }> = [];
    const sendSSE = (event: string, data: unknown) => {
      sseEvents.push({ event, data });
    };

    mockCallTool.mockResolvedValueOnce({
      data: {
        classifications: [
          { skill: "python", classification: "HAS", evidence: "Listed" },
        ],
      },
    });
    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-0",
        itemId: "item-0-0",
        field: "bullet",
        before: "old",
        after: "new",
        rationale: "better",
        keywordsAdded: [],
        gapClassification: "REWRITTEN",
      },
    });

    await runTailorAgent(doc, analysis.atsReport!, analysis, jdText, minimalKB, sendSSE);

    // Expect: tailoring_section, then tailoring_rewrite
    expect(sseEvents[0].event).toBe("tailoring_section");
    expect(sseEvents[1].event).toBe("tailoring_rewrite");
  });

  it("downgrades REWRITTEN to REFRAMED when keyword is missing", async () => {
    const doc = makeDoc([makeSection()]);
    const analysis = makeAnalysisResult();
    const jdText = "Senior Software Engineer";
    const sendSSE = vi.fn();

    mockCallTool.mockResolvedValueOnce({
      data: {
        classifications: [
          { skill: "kubernetes", classification: "LACKS", evidence: "Not found" },
        ],
      },
    });

    // AI claims REWRITTEN but adds a missing keyword (kubernetes)
    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-0",
        itemId: "item-0-0",
        field: "bullet",
        before: "Helped with project delivery",
        after: "Orchestrated containers with Kubernetes",
        rationale: "Added Kubernetes keyword",
        keywordsAdded: ["kubernetes"],
        gapClassification: "REWRITTEN",
      },
    });

    const result = await runTailorAgent(
      doc,
      analysis.atsReport!,
      analysis,
      jdText,
      minimalKB,
      sendSSE,
    );

    // Should be downgraded to REFRAMED since kubernetes is in missingKeywords
    expect(result[0].gapClassification).toBe("REFRAMED");
  });

  it("continues on single bullet failure (graceful degradation)", async () => {
    const doc = makeDoc([
      makeSection({ id: "section-0", items: [
        { id: "item-0-0", heading: "Role 1", bullets: ["Bullet 1"] },
        { id: "item-0-1", heading: "Role 2", bullets: ["Bullet 2"] },
      ]}),
    ]);
    const analysis = makeAnalysisResult({
      sectionScores: [{
        sectionId: "section-0",
        contentScore: 4,
        impactScore: 3,
        issues: [
          { itemId: "item-0-0", type: "weak_bullet", severity: "medium", description: "Weak", suggestion: "Fix" },
          { itemId: "item-0-1", type: "weak_bullet", severity: "high", description: "Vague", suggestion: "Fix" },
        ],
      }],
    });
    const sendSSE = vi.fn();

    mockCallTool.mockResolvedValueOnce({
      data: {
        classifications: [
          { skill: "python", classification: "HAS", evidence: "Present" },
        ],
      },
    });

    // First bullet fails
    mockCallTool.mockRejectedValueOnce(new Error("AI timeout"));
    // Second bullet succeeds
    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-0",
        itemId: "item-0-1",
        field: "bullet",
        before: "Bullet 2",
        after: "Improved bullet 2",
        rationale: "Better",
        keywordsAdded: [],
        gapClassification: "REWRITTEN",
      },
    });

    const result = await runTailorAgent(
      doc,
      analysis.atsReport!,
      analysis,
      "job desc",
      minimalKB,
      sendSSE,
    );

    // Should have 1 successful rewrite, not crash
    expect(result).toHaveLength(1);
    expect(result[0].itemId).toBe("item-0-1");
  });

  it("returns empty array when no sections have issues", async () => {
    const doc = makeDoc([makeSection()]);
    const analysis = makeAnalysisResult({
      sectionScores: [{
        sectionId: "section-0",
        contentScore: 9,
        impactScore: 9,
        issues: [],
      }],
      atsReport: null,
    });
    const sendSSE = vi.fn();

    const result = await runTailorAgent(
      doc,
      null,
      analysis,
      "job desc",
      minimalKB,
      sendSSE,
    );

    expect(result).toEqual([]);
    expect(mockCallTool).not.toHaveBeenCalled();
  });

  it("returns empty array when classify_skills fails", async () => {
    const doc = makeDoc([makeSection()]);
    const analysis = makeAnalysisResult();
    const sendSSE = vi.fn();

    mockCallTool.mockRejectedValueOnce(new Error("AI unavailable"));

    const result = await runTailorAgent(
      doc,
      analysis.atsReport!,
      analysis,
      "job desc",
      minimalKB,
      sendSSE,
    );

    expect(result).toEqual([]);
  });

  it("includes KB learning resources in context for MISSING skills", async () => {
    const doc = makeDoc([makeSection()]);
    const analysis = makeAnalysisResult();
    const jdText = "Senior Engineer with Kubernetes";
    const sendSSE = vi.fn();

    mockCallTool.mockResolvedValueOnce({
      data: {
        classifications: [
          { skill: "kubernetes", classification: "LACKS", evidence: "Not found" },
        ],
      },
    });
    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-0",
        itemId: "item-0-0",
        field: "bullet",
        before: "Helped with project delivery",
        after: "Aspirational: Deployed microservices using Kubernetes",
        rationale: "Missing skill",
        keywordsAdded: [],
        gapClassification: "MISSING",
        learningPath: {
          courses: ["Kubernetes Fundamentals"],
          projects: ["Deploy a microservices app"],
          timeline: "2-3 months",
          targetBullet: "Deployed microservices using Kubernetes",
        },
      },
    });

    const result = await runTailorAgent(
      doc,
      analysis.atsReport!,
      analysis,
      jdText,
      minimalKB,
      sendSSE,
    );

    expect(result).toHaveLength(1);
    expect(result[0].gapClassification).toBe("MISSING");

    // Check that classify_skills call included KB learning resources
    const classifyCall = mockCallTool.mock.calls[0];
    const messages = classifyCall[0] as Array<{ role: string; content: string }>;
    const systemMsg = messages.find((m) => m.role === "system");
    expect(systemMsg!.content).toContain("Kubernetes Fundamentals");
  });
});

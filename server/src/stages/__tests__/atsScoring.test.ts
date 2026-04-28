import { describe, it, expect } from "vitest";
import {
  computeAtsFormattingScore,
  computeKeywordMatchScore,
} from "../atsScoring.js";
import type { DeterministicMetrics, FormattingIssue } from "@resumetra/shared";
import type { ProfessionKnowledgeBase } from "../../knowledge/types.js";
import { genericKB } from "../../knowledge/generic.js";

// ── Helpers ──────────────────────────────────────────────────

type MetricsOverrides = Partial<
  Omit<
    DeterministicMetrics,
    "sectionsPresent" | "sectionsMissing" | "formattingIssues"
  >
> & {
  sectionsPresent?: string[];
  sectionsMissing?: string[];
  formattingIssues?: FormattingIssue[];
};

function makeMetrics(overrides: MetricsOverrides = {}): DeterministicMetrics {
  return {
    wordCount: overrides.wordCount ?? 300,
    bulletCount: overrides.bulletCount ?? 10,
    avgBulletWordCount: overrides.avgBulletWordCount ?? 12,
    sectionsPresent: overrides.sectionsPresent ?? ["experience"],
    sectionsMissing: overrides.sectionsMissing ?? [],
    bulletsWithActionVerb: overrides.bulletsWithActionVerb ?? 8,
    bulletsWithMetric: overrides.bulletsWithMetric ?? 4,
    formattingIssues: overrides.formattingIssues ?? [],
    careerLevelDetected: overrides.careerLevelDetected ?? "mid",
    totalExperienceMonths: overrides.totalExperienceMonths ?? 36,
  };
}

// ── computeAtsFormattingScore ────────────────────────────────

describe("computeAtsFormattingScore", () => {
  it("returns 100 score with no formatting issues", () => {
    const metrics = makeMetrics();
    const result = computeAtsFormattingScore(metrics, genericKB);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it("penalizes high severity issues by 15 points each", () => {
    const issue: FormattingIssue = {
      type: "table_section",
      severity: "high",
      description: "Table layout detected",
      location: "Experience",
    };
    const metrics = makeMetrics({ formattingIssues: [issue] });
    const result = computeAtsFormattingScore(metrics, genericKB);
    expect(result.score).toBe(85);
    expect(result.issues).toHaveLength(1);
  });

  it("penalizes medium severity issues by 8 points each", () => {
    const issue: FormattingIssue = {
      type: "non_standard_bullets",
      severity: "medium",
      description: "Non-standard bullet characters",
    };
    const metrics = makeMetrics({ formattingIssues: [issue] });
    const result = computeAtsFormattingScore(metrics, genericKB);
    expect(result.score).toBe(92);
  });

  it("penalizes low severity issues by 3 points each", () => {
    const issue: FormattingIssue = {
      type: "non_standard_fonts",
      severity: "low",
      description: "Non-standard fonts detected",
    };
    const metrics = makeMetrics({ formattingIssues: [issue] });
    const result = computeAtsFormattingScore(metrics, genericKB);
    expect(result.score).toBe(97);
  });

  it("combines penalties for multiple issues", () => {
    const issues: FormattingIssue[] = [
      { type: "table_section", severity: "high", description: "Table layout" },
      { type: "columns", severity: "high", description: "Multi-column layout" },
      { type: "decorative_bullets", severity: "medium", description: "Decorative bullets" },
    ];
    const metrics = makeMetrics({ formattingIssues: issues });
    const result = computeAtsFormattingScore(metrics, genericKB);
    // 100 - 15 - 15 - 8 = 62
    expect(result.score).toBe(62);
  });

  it("floors score at 0", () => {
    const issues: FormattingIssue[] = Array(10).fill({
      type: "table_section",
      severity: "high",
      description: "Table layout",
    });
    const metrics = makeMetrics({ formattingIssues: issues });
    const result = computeAtsFormattingScore(metrics, genericKB);
    expect(result.score).toBe(0);
  });

  it("passes through issues from metrics", () => {
    const issue: FormattingIssue = {
      type: "table_section",
      severity: "high",
      description: "Table layout",
      location: "Skills",
    };
    const metrics = makeMetrics({ formattingIssues: [issue] });
    const result = computeAtsFormattingScore(metrics, genericKB);
    expect(result.issues[0]).toEqual(issue);
  });
});

// ── computeKeywordMatchScore ─────────────────────────────────

describe("computeKeywordMatchScore", () => {
  describe("exact matching", () => {
    it("scores 100 when all JD keywords match exactly", () => {
      const result = computeKeywordMatchScore(
        ["python", "aws", "docker"],
        ["python", "aws", "docker"],
        { experience: true, skills: true },
      );
      expect(result.exactMatchScore).toBe(100);
      expect(result.matchedKeywords).toEqual(["python", "aws", "docker"]);
      expect(result.missingKeywords).toEqual([]);
    });

    it("scores 0 when no keywords match", () => {
      const result = computeKeywordMatchScore(
        ["python", "aws"],
        ["java", "spring"],
        {},
      );
      expect(result.exactMatchScore).toBe(0);
      expect(result.matchedKeywords).toEqual([]);
      expect(result.missingKeywords).toEqual(["java", "spring"]);
    });

    it("matches case-insensitively", () => {
      const result = computeKeywordMatchScore(
        ["Python", "AWS"],
        ["python", "aws"],
        {},
      );
      expect(result.exactMatchScore).toBe(100);
      expect(result.matchedKeywords).toEqual(["python", "aws"]);
    });

    it("computes partial exact match score", () => {
      const result = computeKeywordMatchScore(
        ["python", "aws"],
        ["python", "java", "docker"],
        {},
      );
      // 1 exact out of 3 = 33.33...
      expect(result.exactMatchScore).toBeCloseTo(100 / 3, 1);
      expect(result.matchedKeywords).toEqual(["python"]);
    });
  });

  describe("partial matching (trigram similarity)", () => {
    it("detects partial match via trigram similarity", () => {
      const result = computeKeywordMatchScore(
        ["python"],
        ["python3"],
        {},
      );
      // "python" trigrams: {pyt, yth, tho, hon}, "python3": {pyt, yth, tho, hon, on3}
      // Jaccard = 4/5 = 0.8
      expect(result.partialMatches.length).toBeGreaterThan(0);
      expect(result.partialMatches[0].similarity).toBeGreaterThanOrEqual(0.8);
    });

    it("does not partial-match already exact-matched keywords", () => {
      const result = computeKeywordMatchScore(
        ["python", "aws"],
        ["python", "aws"],
        {},
      );
      expect(result.partialMatches).toEqual([]);
    });

    it("excludes partial matches below 0.8 threshold", () => {
      const result = computeKeywordMatchScore(
        ["xyz"],
        ["abc"],
        {},
      );
      expect(result.partialMatches).toEqual([]);
    });
  });

  describe("section coverage score", () => {
    it("scores 100 when all sections present", () => {
      const result = computeKeywordMatchScore(
        [],
        [],
        { experience: true, skills: true, education: true },
      );
      expect(result.sectionCoverageScore).toBe(100);
    });

    it("scores 0 when no sections present", () => {
      const result = computeKeywordMatchScore(
        [],
        [],
        { experience: false, skills: false },
      );
      expect(result.sectionCoverageScore).toBe(0);
    });

    it("computes partial coverage score", () => {
      const result = computeKeywordMatchScore(
        [],
        [],
        { experience: true, skills: true, education: false },
      );
      expect(result.sectionCoverageScore).toBeCloseTo(66.67, 1);
    });

    it("handles empty coverage map", () => {
      const result = computeKeywordMatchScore([], [], {});
      expect(result.sectionCoverageScore).toBe(100);
    });
  });

  describe("overall ATS score", () => {
    it("computes weighted score from all components", () => {
      const result = computeKeywordMatchScore(
        ["python", "aws"],
        ["python", "aws", "docker"],
        { experience: true, skills: false },
      );

      // exactMatch = 2/3 * 100 = 66.67
      // partialMatch = depends on trigrams
      // sectionCoverage = 1/2 * 100 = 50
      // formatting score NOT included here — that's separate
      // overallAtsScore = exact * 0.5 + partial * 0.2 + sectionCoverage * 0.2 + formatting * 0.1
      // formatting defaults to 100 when not passed
      expect(result.overallAtsScore).toBeGreaterThan(0);
      expect(result.overallAtsScore).toBeLessThanOrEqual(100);
    });

    it("scores 0 when no JD keywords provided and no coverage", () => {
      const result = computeKeywordMatchScore(
        ["python"],
        [],
        { experience: false },
      );
      // 0 JD keywords → exact = 0, partial = 0
      // coverage = 0/1 * 100 = 0
      // formatting default = 100
      // overall = 0*0.5 + 0*0.2 + 0*0.2 + 100*0.1 = 10
      expect(result.overallAtsScore).toBe(10);
    });
  });

  describe("determinism", () => {
    it("produces identical results given same input", () => {
      const result1 = computeKeywordMatchScore(
        ["python", "aws", "docker"],
        ["python", "kubernetes", "terraform"],
        { experience: true, skills: true },
      );
      const result2 = computeKeywordMatchScore(
        ["python", "aws", "docker"],
        ["python", "kubernetes", "terraform"],
        { experience: true, skills: true },
      );
      expect(result1).toEqual(result2);
    });
  });
});

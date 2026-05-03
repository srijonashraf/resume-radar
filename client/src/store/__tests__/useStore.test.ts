import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../useStore";
import type { AnalysisResultV2 } from "@resumetra/shared";

const MOCK_RESULT: AnalysisResultV2 = {
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
      contentScore: 7,
      impactScore: 6,
      issues: [],
    },
  ],
  readability: { score: 7.5, issues: [] },
  atsReport: null,
  keywordFrequency: {},
};

describe("useStore analysis state", () => {
  beforeEach(() => {
    useStore.getState().clearCurrentAnalysis();
  });

  it("starts with idle analysis phase", () => {
    expect(useStore.getState().analysisPhase).toBe("idle");
    expect(useStore.getState().analysisResult).toBeNull();
    expect(useStore.getState().analysisProgress).toBeNull();
  });

  it("transitions through analysis phases", () => {
    useStore.getState().setAnalysisPhase("computing_metrics");
    expect(useStore.getState().analysisPhase).toBe("computing_metrics");

    useStore.getState().setAnalysisPhase("analyzing");
    expect(useStore.getState().analysisPhase).toBe("analyzing");

    useStore.getState().setAnalysisPhase("complete");
    expect(useStore.getState().analysisPhase).toBe("complete");
  });

  it("stores analysis result", () => {
    useStore.getState().setAnalysisResult(MOCK_RESULT);

    const result = useStore.getState().analysisResult;
    expect(result).not.toBeNull();
    expect(result!.deterministicMetrics.wordCount).toBe(300);
    expect(result!.sectionScores).toHaveLength(1);
    expect(result!.readability.score).toBe(7.5);
  });

  it("tracks analysis progress", () => {
    const progress = { sectionId: "section-0", sectionTitle: "Experience" };
    useStore.getState().setAnalysisProgress(progress);

    expect(useStore.getState().analysisProgress).toEqual(progress);
  });

  it("clears analysis progress on null", () => {
    useStore.getState().setAnalysisProgress({ sectionId: "s1", sectionTitle: "Skills" });
    useStore.getState().setAnalysisProgress(null);

    expect(useStore.getState().analysisProgress).toBeNull();
  });

  it("sets error phase", () => {
    useStore.getState().setAnalysisPhase("error");
    expect(useStore.getState().analysisPhase).toBe("error");
  });

  it("clearCurrentAnalysis resets all analysis state", () => {
    useStore.getState().setAnalysisPhase("complete");
    useStore.getState().setAnalysisResult(MOCK_RESULT);
    useStore.getState().setAnalysisProgress({ sectionId: "s1", sectionTitle: "Skills" });

    useStore.getState().clearCurrentAnalysis();

    expect(useStore.getState().analysisPhase).toBe("idle");
    expect(useStore.getState().analysisResult).toBeNull();
    expect(useStore.getState().analysisProgress).toBeNull();
  });

  it("clearCurrentAnalysis also resets extraction state", () => {
    useStore.getState().setExtractionPhase("complete");
    useStore.getState().setExtractionConfirmed(true);

    useStore.getState().clearCurrentAnalysis();

    expect(useStore.getState().extractionPhase).toBe("idle");
    expect(useStore.getState().extractionConfirmed).toBe(false);
    expect(useStore.getState().extractionResult).toBeNull();
  });
});

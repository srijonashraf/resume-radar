import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../useStore";
import type { Rewrite } from "@resumetra/shared";

const MOCK_REWRITE_1: Rewrite = {
  id: "rewrite-1",
  sectionId: "section-0",
  itemId: "item-0-0",
  field: "bullet",
  before: "Helped with project",
  after: "Led project delivery",
  rationale: "Stronger verb",
  keywordsAdded: ["leadership"],
  gapClassification: "REWRITTEN",
  accepted: null,
};

const MOCK_REWRITE_2: Rewrite = {
  id: "rewrite-2",
  sectionId: "section-0",
  itemId: "item-0-1",
  field: "bullet",
  before: "Used Docker",
  after: "Containerized apps with Docker",
  rationale: "Added containerization keyword",
  keywordsAdded: ["containerization"],
  gapClassification: "REFRAMED",
  accepted: null,
};

const MOCK_REWRITE_3: Rewrite = {
  id: "rewrite-3",
  sectionId: "section-1",
  itemId: "item-1-0",
  field: "bullet",
  before: "No Rust experience",
  after: "Aspirational Rust bullet",
  rationale: "Missing skill",
  keywordsAdded: [],
  gapClassification: "MISSING",
  accepted: null,
};

describe("useStore tailor state", () => {
  beforeEach(() => {
    useStore.getState().clearCurrentAnalysis();
  });

  // ── Initial state ─────────────────────────────────────────────

  it("starts with idle tailor phase", () => {
    expect(useStore.getState().tailorPhase).toBe("idle");
    expect(useStore.getState().tailorRewrites).toEqual([]);
    expect(useStore.getState().tailorProgress).toBeNull();
    expect(useStore.getState().tailorStats).toBeNull();
  });

  // ── Phase transitions ─────────────────────────────────────────

  it("transitions through tailor phases", () => {
    useStore.getState().setTailorPhase("classifying");
    expect(useStore.getState().tailorPhase).toBe("classifying");

    useStore.getState().setTailorPhase("tailoring");
    expect(useStore.getState().tailorPhase).toBe("tailoring");

    useStore.getState().setTailorPhase("complete");
    expect(useStore.getState().tailorPhase).toBe("complete");
  });

  it("sets error phase", () => {
    useStore.getState().setTailorPhase("error");
    expect(useStore.getState().tailorPhase).toBe("error");
  });

  // ── Progress tracking ─────────────────────────────────────────

  it("tracks tailor progress", () => {
    const progress = {
      sectionId: "section-0",
      sectionTitle: "Experience",
      index: 0,
      total: 3,
    };
    useStore.getState().setTailorProgress(progress);

    expect(useStore.getState().tailorProgress).toEqual(progress);
  });

  it("clears tailor progress on null", () => {
    useStore.getState().setTailorProgress({
      sectionId: "s1",
      sectionTitle: "Skills",
      index: 0,
      total: 1,
    });
    useStore.getState().setTailorProgress(null);

    expect(useStore.getState().tailorProgress).toBeNull();
  });

  // ── Incremental rewrite append ────────────────────────────────

  it("addTailorRewrite appends incrementally", () => {
    useStore.getState().addTailorRewrite(MOCK_REWRITE_1);
    expect(useStore.getState().tailorRewrites).toHaveLength(1);

    useStore.getState().addTailorRewrite(MOCK_REWRITE_2);
    expect(useStore.getState().tailorRewrites).toHaveLength(2);
    expect(useStore.getState().tailorRewrites[0]).toEqual(MOCK_REWRITE_1);
    expect(useStore.getState().tailorRewrites[1]).toEqual(MOCK_REWRITE_2);
  });

  // ── Bulk rewrite set ──────────────────────────────────────────

  it("setTailorRewrites replaces all rewrites", () => {
    useStore.getState().addTailorRewrite(MOCK_REWRITE_1);
    useStore.getState().setTailorRewrites([MOCK_REWRITE_2, MOCK_REWRITE_3]);

    expect(useStore.getState().tailorRewrites).toHaveLength(2);
    expect(useStore.getState().tailorRewrites[0]).toEqual(MOCK_REWRITE_2);
  });

  // ── Stats ─────────────────────────────────────────────────────

  it("sets tailor stats", () => {
    const stats = { rewritten: 2, reframed: 1, missing: 1, total: 4 };
    useStore.getState().setTailorStats(stats);

    expect(useStore.getState().tailorStats).toEqual(stats);
  });

  // ── Accept / Reject ───────────────────────────────────────────

  it("acceptTailorRewrite updates accepted to true", () => {
    useStore.getState().setTailorRewrites([MOCK_REWRITE_1, MOCK_REWRITE_2]);
    useStore.getState().acceptTailorRewrite("rewrite-1");

    const rewrites = useStore.getState().tailorRewrites;
    expect(rewrites[0].accepted).toBe(true);
    expect(rewrites[1].accepted).toBeNull(); // unchanged
  });

  it("rejectTailorRewrite updates accepted to false", () => {
    useStore.getState().setTailorRewrites([MOCK_REWRITE_1]);
    useStore.getState().rejectTailorRewrite("rewrite-1");

    expect(useStore.getState().tailorRewrites[0].accepted).toBe(false);
  });

  it("accept/reject preserves immutability of other rewrites", () => {
    useStore.getState().setTailorRewrites([MOCK_REWRITE_1, MOCK_REWRITE_2]);
    useStore.getState().acceptTailorRewrite("rewrite-1");

    const rewrites = useStore.getState().tailorRewrites;
    // Only the matched rewrite changed
    expect(rewrites[0].accepted).toBe(true);
    expect(rewrites[1].accepted).toBeNull();
    expect(rewrites[0].before).toBe(MOCK_REWRITE_1.before);
    expect(rewrites[1].before).toBe(MOCK_REWRITE_2.before);
  });

  // ── Clear state ───────────────────────────────────────────────

  it("clearTailorState resets all tailor state", () => {
    useStore.getState().setTailorPhase("complete");
    useStore.getState().setTailorRewrites([MOCK_REWRITE_1]);
    useStore.getState().setTailorStats({ rewritten: 1, reframed: 0, missing: 0, total: 1 });
    useStore.getState().setTailorProgress({
      sectionId: "s1",
      sectionTitle: "Skills",
      index: 0,
      total: 1,
    });

    useStore.getState().clearTailorState();

    expect(useStore.getState().tailorPhase).toBe("idle");
    expect(useStore.getState().tailorRewrites).toEqual([]);
    expect(useStore.getState().tailorStats).toBeNull();
    expect(useStore.getState().tailorProgress).toBeNull();
  });

  it("clearCurrentAnalysis also clears tailor state", () => {
    useStore.getState().setTailorPhase("complete");
    useStore.getState().setTailorRewrites([MOCK_REWRITE_1]);
    useStore.getState().setTailorStats({ rewritten: 1, reframed: 0, missing: 0, total: 1 });

    useStore.getState().clearCurrentAnalysis();

    expect(useStore.getState().tailorPhase).toBe("idle");
    expect(useStore.getState().tailorRewrites).toEqual([]);
    expect(useStore.getState().tailorStats).toBeNull();
  });

  // ── Existing state unaffected ─────────────────────────────────

  it("tailor state changes do not affect analysis state", () => {
    useStore.getState().setAnalysisPhase("complete");
    useStore.getState().setTailorPhase("tailoring");

    expect(useStore.getState().analysisPhase).toBe("complete");
    expect(useStore.getState().tailorPhase).toBe("tailoring");
  });

  it("tailor state changes do not affect extraction state", () => {
    useStore.getState().setExtractionPhase("complete");
    useStore.getState().setExtractionConfirmed(true);
    useStore.getState().setTailorPhase("classifying");

    expect(useStore.getState().extractionPhase).toBe("complete");
    expect(useStore.getState().extractionConfirmed).toBe(true);
  });
});

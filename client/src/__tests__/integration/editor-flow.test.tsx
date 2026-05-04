import { describe, it, expect, beforeEach } from "vitest";
import { useResumeEditorStore } from "../../store/useResumeEditorStore";
import type { ResumeDocument, Rewrite } from "@resumetra/shared";

// ── Test fixtures ─────────────────────────────────────────────────────

function makeDocument(): ResumeDocument {
  return {
    contact: {
      fullName: "Jane Smith",
      email: "jane@example.com",
      phone: null,
      location: null,
      linkedin: null,
      github: null,
      portfolio: null,
    },
    sections: [
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
            bullets: [
              "Helped with project delivery",
              "Worked on microservices",
              "Participated in code reviews",
            ],
          },
          {
            id: "item-0-1",
            heading: "Meta",
            subheading: "Senior Engineer",
            dateRange: "2023 – Present",
            bullets: ["Built internal tools"],
          },
        ],
      },
      {
        id: "section-1",
        type: "list",
        title: "Skills",
        displayOrder: 1,
        items: [
          {
            id: "item-1-0",
            items: ["Python", "Go", "Docker"],
          },
        ],
      },
    ],
    detectedProfession: "software_engineer",
    detectedCareerLevel: "mid",
  };
}

function makeRewrite(overrides: Partial<Rewrite> = {}): Rewrite {
  return {
    id: "rewrite-0",
    sectionId: "section-0",
    itemId: "item-0-0",
    field: "bullets.0",
    before: "Helped with project delivery",
    after: "Led cross-team project delivery across 3 engineering teams",
    rationale: "Stronger action verb with quantification",
    keywordsAdded: ["leadership", "project management"],
    gapClassification: "REWRITTEN",
    accepted: null,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("Editor store integration flow", () => {
  beforeEach(() => {
    // Reset the zustand store between tests
    useResumeEditorStore.getState().resetEditor();
  });

  it("initializes with document and rewrites", () => {
    const doc = makeDocument();
    const rewrites = [makeRewrite()];

    useResumeEditorStore.getState().initialize(doc, rewrites);

    const state = useResumeEditorStore.getState();
    expect(state.sourceDocument).not.toBeNull();
    expect(state.sourceDocument!.sections).toHaveLength(2);
    expect(state.rewrites).toHaveLength(1);
    expect(state.sectionOrder).toEqual(["section-0", "section-1"]);
    expect(state.activeSectionId).toBe("section-0");
  });

  it("getResolvedDocument returns source values when no edits or rewrites", () => {
    const doc = makeDocument();

    useResumeEditorStore.getState().initialize(doc);

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved).not.toBeNull();
    expect(resolved!.sections[0].items[0].bullets![0]).toBe(
      "Helped with project delivery",
    );
  });

  it("accepting a rewrite is reflected in getResolvedDocument", () => {
    const doc = makeDocument();
    const rewrite = makeRewrite();

    useResumeEditorStore.getState().initialize(doc, [rewrite]);
    useResumeEditorStore.getState().acceptRewrite("rewrite-0");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved!.sections[0].items[0].bullets![0]).toBe(
      "Led cross-team project delivery across 3 engineering teams",
    );
  });

  it("rejecting a rewrite keeps the source value", () => {
    const doc = makeDocument();
    const rewrite = makeRewrite();

    useResumeEditorStore.getState().initialize(doc, [rewrite]);
    useResumeEditorStore.getState().rejectRewrite("rewrite-0");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved!.sections[0].items[0].bullets![0]).toBe(
      "Helped with project delivery",
    );
  });

  it("user edit overrides accepted rewrite", () => {
    const doc = makeDocument();
    const rewrite = makeRewrite();

    useResumeEditorStore.getState().initialize(doc, [rewrite]);
    useResumeEditorStore.getState().acceptRewrite("rewrite-0");

    // Now apply a user edit to the same field
    useResumeEditorStore.getState().setUserEdit(
      "section-0.item-0-0.bullets.0",
      "My custom bullet text",
    );

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved!.sections[0].items[0].bullets![0]).toBe(
      "My custom bullet text",
    );
  });

  it("user edit overrides source when no rewrite exists", () => {
    const doc = makeDocument();

    useResumeEditorStore.getState().initialize(doc);
    useResumeEditorStore.getState().setUserEdit(
      "section-0.item-0-0.heading",
      "Alphabet",
    );

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved!.sections[0].items[0].heading).toBe("Alphabet");
  });

  it("clearing user edit falls back to accepted rewrite", () => {
    const doc = makeDocument();
    const rewrite = makeRewrite();

    useResumeEditorStore.getState().initialize(doc, [rewrite]);
    useResumeEditorStore.getState().acceptRewrite("rewrite-0");
    useResumeEditorStore.getState().setUserEdit(
      "section-0.item-0-0.bullets.0",
      "My custom bullet",
    );

    // Clear the user edit
    useResumeEditorStore.getState().clearUserEdit(
      "section-0.item-0-0.bullets.0",
    );

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    // Should fall back to accepted rewrite
    expect(resolved!.sections[0].items[0].bullets![0]).toBe(
      "Led cross-team project delivery across 3 engineering teams",
    );
  });

  it("clearing user edit falls back to source when no rewrite accepted", () => {
    const doc = makeDocument();
    const rewrite = makeRewrite();

    useResumeEditorStore.getState().initialize(doc, [rewrite]);
    useResumeEditorStore.getState().setUserEdit(
      "section-0.item-0-0.bullets.0",
      "My custom bullet",
    );

    // Clear without accepting rewrite
    useResumeEditorStore.getState().clearUserEdit(
      "section-0.item-0-0.bullets.0",
    );

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved!.sections[0].items[0].bullets![0]).toBe(
      "Helped with project delivery",
    );
  });

  it("accepting all rewrites applies all at once", () => {
    const doc = makeDocument();
    const rewrite0 = makeRewrite({ id: "rewrite-0" });
    const rewrite1 = makeRewrite({
      id: "rewrite-1",
      field: "bullets.1",
      before: "Worked on microservices",
      after: "Architected and deployed microservices serving 10k RPS",
    });

    useResumeEditorStore.getState().initialize(doc, [rewrite0, rewrite1]);
    useResumeEditorStore.getState().acceptAllRewrites();

    const state = useResumeEditorStore.getState();
    expect(state.rewrites.every((r) => r.accepted === true)).toBe(true);

    const resolved = state.getResolvedDocument();
    expect(resolved!.sections[0].items[0].bullets![0]).toBe(
      "Led cross-team project delivery across 3 engineering teams",
    );
    expect(resolved!.sections[0].items[0].bullets![1]).toBe(
      "Architected and deployed microservices serving 10k RPS",
    );
  });

  it("rejecting all rewrites clears all accepted states", () => {
    const doc = makeDocument();
    const rewrite = makeRewrite();

    useResumeEditorStore.getState().initialize(doc, [rewrite]);
    useResumeEditorStore.getState().acceptRewrite("rewrite-0");
    useResumeEditorStore.getState().rejectAllRewrites();

    const state = useResumeEditorStore.getState();
    expect(state.rewrites.every((r) => r.accepted === false)).toBe(true);

    const resolved = state.getResolvedDocument();
    expect(resolved!.sections[0].items[0].bullets![0]).toBe(
      "Helped with project delivery",
    );
  });

  it("resetEditor clears all state back to initial", () => {
    const doc = makeDocument();
    const rewrite = makeRewrite();

    useResumeEditorStore.getState().initialize(doc, [rewrite]);
    useResumeEditorStore.getState().acceptRewrite("rewrite-0");
    useResumeEditorStore.getState().setUserEdit("section-0.item-0-0.heading", "Test");
    useResumeEditorStore.getState().setActiveSection("section-1");

    useResumeEditorStore.getState().resetEditor();

    const state = useResumeEditorStore.getState();
    expect(state.sourceDocument).toBeNull();
    expect(state.rewrites).toEqual([]);
    expect(state.userEdits.size).toBe(0);
    expect(state.sectionOrder).toEqual([]);
    expect(state.activeSectionId).toBeNull();
    expect(state.getResolvedDocument()).toBeNull();
  });

  it("handles scalar field rewrite (heading)", () => {
    const doc = makeDocument();
    const rewrite: Rewrite = {
      id: "rewrite-heading",
      sectionId: "section-0",
      itemId: "item-0-0",
      field: "heading",
      before: "Google",
      after: "Google LLC",
      rationale: "Full company name for ATS",
      keywordsAdded: [],
      gapClassification: "REFRAMED",
      accepted: null,
    };

    useResumeEditorStore.getState().initialize(doc, [rewrite]);
    useResumeEditorStore.getState().acceptRewrite("rewrite-heading");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved!.sections[0].items[0].heading).toBe("Google LLC");
  });

  it("reordering sections changes resolved document order", () => {
    const doc = makeDocument();

    useResumeEditorStore.getState().initialize(doc);
    // Move section-1 to index 0
    useResumeEditorStore.getState().reorderSection("section-1", 0);

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved!.sections[0].id).toBe("section-1");
    expect(resolved!.sections[1].id).toBe("section-0");
  });

  it("initialize resets previous userEdits and rewrites", () => {
    const doc1 = makeDocument();
    const doc2 = makeDocument();

    useResumeEditorStore.getState().initialize(doc1);
    useResumeEditorStore.getState().setUserEdit("section-0.item-0-0.heading", "Edited");

    // Re-initialize with fresh document
    useResumeEditorStore.getState().initialize(doc2);

    const state = useResumeEditorStore.getState();
    expect(state.userEdits.size).toBe(0);
    expect(state.rewrites).toEqual([]);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { useResumeEditorStore } from "../useResumeEditorStore";
import type { ResumeDocument, DynamicSection, SectionItem } from "@resumetra/shared";
import type { Rewrite } from "@resumetra/shared";

// ── Fixtures ──────────────────────────────────────────────────────────

const makeSection = (
  overrides: Partial<DynamicSection> & { id: string; type: DynamicSection["type"] },
): DynamicSection => ({
  title: "Test Section",
  displayOrder: 0,
  items: [],
  ...overrides,
});

const makeItem = (overrides: Partial<SectionItem> & { id: string }): SectionItem => ({
  ...overrides,
});

const MOCK_DOC: ResumeDocument = {
  contact: {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "555-0100",
    location: "New York",
    linkedin: null,
    github: null,
    portfolio: null,
  },
  sections: [
    makeSection({
      id: "exp-1",
      type: "experience",
      title: "Work Experience",
      displayOrder: 0,
      items: [
        makeItem({
          id: "job-1",
          heading: "Acme Corp",
          subheading: "Senior Engineer",
          dateRange: "2020 - 2023",
          bullets: ["Built microservices", "Led team of 5"],
        }),
        makeItem({
          id: "job-2",
          heading: "Beta Inc",
          subheading: "Engineer",
          dateRange: "2018 - 2020",
          bullets: ["Wrote tests", "Deployed apps"],
        }),
      ],
    }),
    makeSection({
      id: "summary-1",
      type: "text",
      title: "Summary",
      displayOrder: 1,
      items: [
        makeItem({ id: "sum-item", description: "Experienced software engineer" }),
      ],
    }),
    makeSection({
      id: "skills-1",
      type: "list",
      title: "Skills",
      displayOrder: 2,
      items: [
        makeItem({ id: "skills-item", items: ["TypeScript", "React", "Node.js"] }),
      ],
    }),
  ],
  detectedProfession: "Software Engineer",
  detectedCareerLevel: "Senior",
};

const MOCK_REWRITES: Rewrite[] = [
  {
    id: "rw-1",
    sectionId: "exp-1",
    itemId: "job-1",
    field: "bullets.0",
    before: "Built microservices",
    after: "Architected and deployed scalable microservices",
    rationale: "Stronger verb",
    keywordsAdded: ["architecture"],
    gapClassification: "REWRITTEN",
    accepted: null,
  },
  {
    id: "rw-2",
    sectionId: "exp-1",
    itemId: "job-1",
    field: "bullets.1",
    before: "Led team of 5",
    after: "Led cross-functional team of 5 engineers",
    rationale: "Added detail",
    keywordsAdded: ["leadership"],
    gapClassification: "REFRAMED",
    accepted: null,
  },
  {
    id: "rw-3",
    sectionId: "summary-1",
    itemId: "sum-item",
    field: "description",
    before: "Experienced software engineer",
    after: "Senior software engineer with 8+ years of experience",
    rationale: "Added seniority and years",
    keywordsAdded: ["senior"],
    gapClassification: "REWRITTEN",
    accepted: null,
  },
];

// ── Tests ─────────────────────────────────────────────────────────────

describe("useResumeEditorStore", () => {
  beforeEach(() => {
    useResumeEditorStore.getState().resetEditor();
  });

  // ── Initial state ──────────────────────────────────────────────

  it("starts with null source document", () => {
    const state = useResumeEditorStore.getState();
    expect(state.sourceDocument).toBeNull();
    expect(state.rewrites).toEqual([]);
    expect(state.userEdits).toBeInstanceOf(Map);
    expect(state.userEdits.size).toBe(0);
    expect(state.sectionOrder).toEqual([]);
    expect(state.selectedTemplate).toBe("professional");
    expect(state.activeSectionId).toBeNull();
  });

  // ── Initialize ─────────────────────────────────────────────────

  it("initialize hydrates store with document and rewrites", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);

    const state = useResumeEditorStore.getState();
    expect(state.sourceDocument).toEqual(MOCK_DOC);
    expect(state.rewrites).toEqual(MOCK_REWRITES);
    expect(state.sectionOrder).toEqual(["exp-1", "summary-1", "skills-1"]);
    expect(state.activeSectionId).toBe("exp-1");
  });

  it("initialize without rewrites defaults to empty array", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);

    expect(useResumeEditorStore.getState().rewrites).toEqual([]);
  });

  // ── getResolvedDocument — Layer 1 (source only) ────────────────

  it("getResolvedDocument returns source when no edits or rewrites", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved).toEqual(MOCK_DOC);
  });

  it("getResolvedDocument returns null when not initialized", () => {
    expect(useResumeEditorStore.getState().getResolvedDocument()).toBeNull();
  });

  // ── getResolvedDocument — Layer 2 (accepted rewrite overrides source) ─

  it("accepted rewrite overrides source value", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
    useResumeEditorStore.getState().acceptRewrite("rw-1");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    const bullet0 = resolved!.sections[0].items[0].bullets![0];
    expect(bullet0).toBe("Architected and deployed scalable microservices");
  });

  it("rejected rewrite does not override source", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
    useResumeEditorStore.getState().rejectRewrite("rw-1");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    const bullet0 = resolved!.sections[0].items[0].bullets![0];
    expect(bullet0).toBe("Built microservices");
  });

  it("pending rewrite (null accepted) does not override source", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    const bullet0 = resolved!.sections[0].items[0].bullets![0];
    expect(bullet0).toBe("Built microservices");
  });

  // ── getResolvedDocument — Layer 3 (user edit overrides all) ────

  it("user edit overrides both source and accepted rewrite", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
    useResumeEditorStore.getState().acceptRewrite("rw-1");
    useResumeEditorStore.getState().setUserEdit("exp-1.job-1.bullets.0", "My custom text");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    const bullet0 = resolved!.sections[0].items[0].bullets![0];
    expect(bullet0).toBe("My custom text");
  });

  it("user edit overrides source when no rewrite", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);
    useResumeEditorStore.getState().setUserEdit("exp-1.job-2.heading", "New Company Name");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved!.sections[0].items[1].heading).toBe("New Company Name");
  });

  // ── clearUserEdit ──────────────────────────────────────────────

  it("clearUserEdit falls back to accepted rewrite", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
    useResumeEditorStore.getState().acceptRewrite("rw-1");
    useResumeEditorStore.getState().setUserEdit("exp-1.job-1.bullets.0", "Temporary");
    useResumeEditorStore.getState().clearUserEdit("exp-1.job-1.bullets.0");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    const bullet0 = resolved!.sections[0].items[0].bullets![0];
    expect(bullet0).toBe("Architected and deployed scalable microservices");
  });

  it("clearUserEdit falls back to source when no rewrite accepted", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);
    useResumeEditorStore.getState().setUserEdit("exp-1.job-1.heading", "Temp");
    useResumeEditorStore.getState().clearUserEdit("exp-1.job-1.heading");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved!.sections[0].items[0].heading).toBe("Acme Corp");
  });

  // ── Accept / Reject — immutability ─────────────────────────────

  it("acceptRewrite sets accepted to true immutably", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
    const original = [...useResumeEditorStore.getState().rewrites];

    useResumeEditorStore.getState().acceptRewrite("rw-1");

    const rewrites = useResumeEditorStore.getState().rewrites;
    expect(rewrites[0].accepted).toBe(true);
    expect(rewrites[1].accepted).toBeNull();
    // Other rewrite unchanged
    expect(rewrites[1]).toEqual(original[1]);
  });

  it("rejectRewrite sets accepted to false immutably", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
    useResumeEditorStore.getState().rejectRewrite("rw-2");

    const rewrites = useResumeEditorStore.getState().rewrites;
    expect(rewrites[0].accepted).toBeNull();
    expect(rewrites[1].accepted).toBe(false);
  });

  it("acceptAllRewrites accepts all pending rewrites", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
    useResumeEditorStore.getState().acceptAllRewrites();

    const rewrites = useResumeEditorStore.getState().rewrites;
    expect(rewrites.every((r) => r.accepted === true)).toBe(true);
  });

  it("rejectAllRewrites rejects all pending rewrites", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
    useResumeEditorStore.getState().rejectAllRewrites();

    const rewrites = useResumeEditorStore.getState().rewrites;
    expect(rewrites.every((r) => r.accepted === false)).toBe(true);
  });

  it("resetRewrites sets all accepted back to null", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
    useResumeEditorStore.getState().acceptRewrite("rw-1");
    useResumeEditorStore.getState().rejectRewrite("rw-2");

    useResumeEditorStore.getState().resetRewrites();

    const rewrites = useResumeEditorStore.getState().rewrites;
    expect(rewrites.every((r) => r.accepted === null)).toBe(true);
  });

  // ── Section reorder ────────────────────────────────────────────

  it("reorderSection moves section to new index", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);
    expect(useResumeEditorStore.getState().sectionOrder).toEqual([
      "exp-1",
      "summary-1",
      "skills-1",
    ]);

    // Move skills to index 0
    useResumeEditorStore.getState().reorderSection("skills-1", 0);
    expect(useResumeEditorStore.getState().sectionOrder).toEqual([
      "skills-1",
      "exp-1",
      "summary-1",
    ]);
  });

  // ── Add/remove bullets ─────────────────────────────────────────

  it("addBullet appends bullet to item", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);
    useResumeEditorStore.getState().addBullet("exp-1", "job-1", "New bullet text");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    const bullets = resolved!.sections[0].items[0].bullets!;
    expect(bullets).toHaveLength(3);
    expect(bullets[2]).toBe("New bullet text");
  });

  it("removeBullet removes bullet at index", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);
    useResumeEditorStore.getState().removeBullet("exp-1", "job-1", 0);

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    const bullets = resolved!.sections[0].items[0].bullets!;
    expect(bullets).toHaveLength(1);
    expect(bullets[0]).toBe("Led team of 5");
  });

  // ── Add/remove entries ─────────────────────────────────────────

  it("addEntry appends empty item to section", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);
    useResumeEditorStore.getState().addEntry("exp-1");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    const items = resolved!.sections[0].items;
    expect(items).toHaveLength(3);
    // New item has empty defaults
    expect(items[2].heading).toBe("");
    expect(items[2].bullets).toEqual([]);
  });

  it("removeEntry removes item by id", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);
    useResumeEditorStore.getState().removeEntry("exp-1", "job-1");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    const items = resolved!.sections[0].items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("job-2");
  });

  // ── Template switching ─────────────────────────────────────────

  it("setTemplate changes template without affecting other state", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);
    useResumeEditorStore.getState().setUserEdit("exp-1.job-1.heading", "Edited");

    useResumeEditorStore.getState().setTemplate("modern");

    const state = useResumeEditorStore.getState();
    expect(state.selectedTemplate).toBe("modern");
    // User edits preserved
    expect(state.userEdits.get("exp-1.job-1.heading")).toBe("Edited");
    // Source document unchanged
    expect(state.sourceDocument).toEqual(MOCK_DOC);
  });

  // ── setActiveSection ───────────────────────────────────────────

  it("setActiveSection updates activeSectionId", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);
    useResumeEditorStore.getState().setActiveSection("skills-1");

    expect(useResumeEditorStore.getState().activeSectionId).toBe("skills-1");
  });

  // ── resetEditor ────────────────────────────────────────────────

  it("resetEditor clears everything", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
    useResumeEditorStore.getState().setUserEdit("exp-1.job-1.heading", "Edited");
    useResumeEditorStore.getState().acceptRewrite("rw-1");
    useResumeEditorStore.getState().setTemplate("modern");

    useResumeEditorStore.getState().resetEditor();

    const state = useResumeEditorStore.getState();
    expect(state.sourceDocument).toBeNull();
    expect(state.rewrites).toEqual([]);
    expect(state.userEdits.size).toBe(0);
    expect(state.sectionOrder).toEqual([]);
    expect(state.selectedTemplate).toBe("professional");
    expect(state.activeSectionId).toBeNull();
  });

  // ── Edge: rewrites for bullets with user edits ─────────────────

  it("getResolvedDocument handles description field rewrite", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
    useResumeEditorStore.getState().acceptRewrite("rw-3");

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    const desc = resolved!.sections[1].items[0].description;
    expect(desc).toBe("Senior software engineer with 8+ years of experience");
  });

  // ── getResolvedDocument creates deep copy (mutation safe) ──────

  it("getResolvedDocument returns a fresh object each call", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);

    const first = useResumeEditorStore.getState().getResolvedDocument();
    const second = useResumeEditorStore.getState().getResolvedDocument();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  // ── getResolvedDocument respects sectionOrder ──────────────────

  it("getResolvedDocument orders sections by sectionOrder", () => {
    useResumeEditorStore.getState().initialize(MOCK_DOC);
    useResumeEditorStore.getState().reorderSection("skills-1", 0);

    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved!.sections[0].id).toBe("skills-1");
    expect(resolved!.sections[1].id).toBe("exp-1");
    expect(resolved!.sections[2].id).toBe("summary-1");
  });
});

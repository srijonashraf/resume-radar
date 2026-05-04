import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useResumeEditorStore } from "../../../store/useResumeEditorStore";
import type { ResumeDocument, DynamicSection, Rewrite } from "@resumetra/shared";
import BuildMode from "../BuildMode";

// ── Fixtures ──────────────────────────────────────────────────────────

const SECTION_EXP = "sec-exp";
const SECTION_SUM = "sec-summary";
const SECTION_SKL = "sec-skills";

function makeSection(
  overrides: Partial<DynamicSection> & { id: string; type: DynamicSection["type"] },
): DynamicSection {
  return { title: "Section", displayOrder: 0, items: [], ...overrides };
}

const THIN_DOC: ResumeDocument = {
  contact: {
    fullName: "Thin User",
    email: "thin@test.com",
    phone: "555-0000",
    location: "NYC",
    linkedin: null,
    github: null,
    portfolio: null,
  },
  sections: [
    makeSection({
      id: SECTION_EXP,
      type: "experience",
      title: "Experience",
      items: [
        {
          id: "item-1",
          heading: "Software Engineer",
          subheading: "Acme Corp",
          dateRange: "2020 - 2022",
          bullets: ["Did one thing"], // only 1 bullet — thin
        },
      ],
    }),
    makeSection({
      id: SECTION_SUM,
      type: "text",
      title: "Summary",
      items: [], // empty — thin
    }),
    makeSection({
      id: SECTION_SKL,
      type: "list",
      title: "Skills",
      items: [{ id: "item-skl", items: ["JavaScript"] }],
    }),
  ],
  detectedProfession: "Engineer",
  detectedCareerLevel: "Junior",
};

const FULL_DOC: ResumeDocument = {
  contact: {
    fullName: "Full User",
    email: "full@test.com",
    phone: "555-0000",
    location: "NYC",
    linkedin: null,
    github: null,
    portfolio: null,
  },
  sections: [
    makeSection({
      id: SECTION_EXP,
      type: "experience",
      title: "Experience",
      items: [
        {
          id: "item-1",
          heading: "Software Engineer",
          subheading: "Acme Corp",
          dateRange: "2020 - 2022",
          bullets: ["Built feature A", "Led project B", "Improved perf by 50%"], // 3 bullets
        },
      ],
    }),
    makeSection({
      id: SECTION_SUM,
      type: "text",
      title: "Summary",
      items: [{ id: "item-sum", description: "Experienced engineer" }],
    }),
    makeSection({
      id: SECTION_SKL,
      type: "list",
      title: "Skills",
      items: [{ id: "item-skl", items: ["JavaScript", "React", "TypeScript"] }],
    }),
  ],
  detectedProfession: "Engineer",
  detectedCareerLevel: "Senior",
};

const MISSING_REWRITES: Rewrite[] = [
  {
    id: "rw-missing-1",
    sectionId: SECTION_SKL,
    itemId: "item-skl",
    field: "items.1",
    before: "",
    after: "Python",
    rationale: "JD requires Python",
    keywordsAdded: ["Python"],
    gapClassification: "MISSING",
    accepted: null,
  },
  {
    id: "rw-rewritten-1",
    sectionId: SECTION_EXP,
    itemId: "item-1",
    field: "bullets.0",
    before: "Did one thing",
    after: "Spearheaded initiatives",
    rationale: "Stronger verb",
    keywordsAdded: ["leadership"],
    gapClassification: "REWRITTEN",
    accepted: null,
  },
];

beforeEach(() => {
  useResumeEditorStore.getState().resetEditor();
});

describe("BuildMode", () => {
  describe("store: thin resume detection", () => {
    it("detects thin resume with < 3 bullets per experience entry", () => {
      useResumeEditorStore.getState().initialize(THIN_DOC);
      expect(useResumeEditorStore.getState().isThinResume).toBe(true);
    });

    it("does not flag a full resume as thin", () => {
      useResumeEditorStore.getState().initialize(FULL_DOC);
      expect(useResumeEditorStore.getState().isThinResume).toBe(false);
    });

    it("detects thin resume with < 3 sections containing content", () => {
      const sparseDoc: ResumeDocument = {
        ...THIN_DOC,
        sections: [
          makeSection({
            id: SECTION_EXP,
            type: "experience",
            title: "Experience",
            items: [
              {
                id: "item-1",
                heading: "Software Engineer",
                bullets: ["Built feature A", "Led project B", "Shipped product C"],
              },
            ],
          }),
          // only 1 section with content
        ],
      };
      useResumeEditorStore.getState().initialize(sparseDoc);
      expect(useResumeEditorStore.getState().isThinResume).toBe(true);
    });
  });

  describe("store: build mode toggle", () => {
    it("toggles buildModeActive", () => {
      useResumeEditorStore.getState().initialize(THIN_DOC);
      expect(useResumeEditorStore.getState().buildModeActive).toBe(false);

      useResumeEditorStore.getState().toggleBuildMode();
      expect(useResumeEditorStore.getState().buildModeActive).toBe(true);

      useResumeEditorStore.getState().toggleBuildMode();
      expect(useResumeEditorStore.getState().buildModeActive).toBe(false);
    });

    it("resets buildModeActive on re-initialize", () => {
      useResumeEditorStore.getState().initialize(THIN_DOC);
      useResumeEditorStore.getState().toggleBuildMode();
      expect(useResumeEditorStore.getState().buildModeActive).toBe(true);

      useResumeEditorStore.getState().initialize(THIN_DOC);
      expect(useResumeEditorStore.getState().buildModeActive).toBe(false);
    });
  });

  describe("component: content checklist", () => {
    it("renders content checklist for thin resume when buildModeActive", () => {
      useResumeEditorStore.getState().initialize(THIN_DOC);
      useResumeEditorStore.getState().toggleBuildMode();
      render(<BuildMode />);

      expect(screen.getByTestId("build-mode-panel")).toBeInTheDocument();
      // Should show "Add more bullets" advice for thin experience
      expect(screen.getByText(/add more bullets/i)).toBeInTheDocument();
    });

    it("does not render when buildModeActive is false", () => {
      useResumeEditorStore.getState().initialize(THIN_DOC);
      render(<BuildMode />);

      expect(screen.queryByTestId("build-mode-panel")).not.toBeInTheDocument();
    });

    it("does not render when not a thin resume", () => {
      useResumeEditorStore.getState().initialize(FULL_DOC);
      useResumeEditorStore.getState().toggleBuildMode();
      render(<BuildMode />);

      expect(screen.queryByTestId("build-mode-panel")).not.toBeInTheDocument();
    });

    it("shows 'Add summary' for empty summary section", () => {
      useResumeEditorStore.getState().initialize(THIN_DOC);
      useResumeEditorStore.getState().toggleBuildMode();
      render(<BuildMode />);

      expect(screen.getByText(/add summary/i)).toBeInTheDocument();
    });

    it("shows missing skills from JD rewrites", () => {
      useResumeEditorStore.getState().initialize(THIN_DOC, MISSING_REWRITES);
      useResumeEditorStore.getState().toggleBuildMode();
      render(<BuildMode />);

      expect(screen.getByText(/add missing skills from jd/i)).toBeInTheDocument();
    });

    it("shows bullet count correctly", () => {
      useResumeEditorStore.getState().initialize(THIN_DOC);
      useResumeEditorStore.getState().toggleBuildMode();
      render(<BuildMode />);

      // Experience entry has 1 bullet, needs 3 minimum
      expect(screen.getByText(/1\/3 minimum/i)).toBeInTheDocument();
    });

    it("shows progress indicator", () => {
      useResumeEditorStore.getState().initialize(THIN_DOC);
      useResumeEditorStore.getState().toggleBuildMode();
      render(<BuildMode />);

      expect(screen.getByTestId("build-mode-progress")).toBeInTheDocument();
    });
  });

  describe("component: add suggested bullet", () => {
    it("adds a template bullet when button is clicked", () => {
      useResumeEditorStore.getState().initialize(THIN_DOC);
      useResumeEditorStore.getState().toggleBuildMode();
      render(<BuildMode />);

      const addBtn = screen.getByRole("button", { name: /add suggested bullet/i });
      fireEvent.click(addBtn);

      const doc = useResumeEditorStore.getState().sourceDocument;
      const expSection = doc!.sections.find((s) => s.id === SECTION_EXP)!;
      expect(expSection.items[0].bullets!.length).toBe(2); // was 1, now 2
    });

    it("adds bullet to the correct experience entry", () => {
      const multiEntryDoc: ResumeDocument = {
        ...THIN_DOC,
        sections: [
          makeSection({
            id: SECTION_EXP,
            type: "experience",
            title: "Experience",
            items: [
              {
                id: "item-1",
                heading: "Software Engineer",
                bullets: ["Did one thing"],
              },
              {
                id: "item-2",
                heading: "Junior Developer",
                bullets: ["Did another thing"],
              },
            ],
          }),
          makeSection({
            id: SECTION_SKL,
            type: "list",
            title: "Skills",
            items: [{ id: "item-skl", items: ["JS"] }],
          }),
          makeSection({
            id: SECTION_SUM,
            type: "text",
            title: "Summary",
            items: [],
          }),
        ],
      };

      useResumeEditorStore.getState().initialize(multiEntryDoc);
      useResumeEditorStore.getState().toggleBuildMode();
      render(<BuildMode />);

      // There should be multiple "Add suggested bullet" buttons
      const addBtns = screen.getAllByRole("button", { name: /add suggested bullet/i });
      expect(addBtns.length).toBe(2); // one per thin entry

      // Click the first one
      fireEvent.click(addBtns[0]);

      const doc = useResumeEditorStore.getState().sourceDocument;
      const expSection = doc!.sections.find((s) => s.id === SECTION_EXP)!;
      expect(expSection.items[0].bullets!.length).toBe(2); // first entry grows
      expect(expSection.items[1].bullets!.length).toBe(1); // second unchanged
    });
  });

  describe("component: dismiss", () => {
    it("dismisses build mode on dismiss button click", () => {
      useResumeEditorStore.getState().initialize(THIN_DOC);
      useResumeEditorStore.getState().toggleBuildMode();
      render(<BuildMode />);

      const dismissBtn = screen.getByRole("button", { name: /dismiss/i });
      fireEvent.click(dismissBtn);

      expect(useResumeEditorStore.getState().buildModeActive).toBe(false);
      expect(screen.queryByTestId("build-mode-panel")).not.toBeInTheDocument();
    });
  });
});

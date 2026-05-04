import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useResumeEditorStore } from "../../../store/useResumeEditorStore";
import type { ResumeDocument, DynamicSection, Rewrite } from "@resumetra/shared";
import EditorSidebar from "../EditorSidebar";

// ── Fixtures ──────────────────────────────────────────────────────────

const SECTION_EXP = "sec-exp";
const SECTION_SUM = "sec-summary";
const SECTION_SKL = "sec-skills";

function makeSection(
  overrides: Partial<DynamicSection> & { id: string; type: DynamicSection["type"] },
): DynamicSection {
  return { title: "Section", displayOrder: 0, items: [], ...overrides };
}

const MOCK_DOC: ResumeDocument = {
  contact: {
    fullName: "Test User",
    email: "test@test.com",
    phone: "555-0000",
    location: "NYC",
    linkedin: null,
    github: null,
    portfolio: null,
  },
  sections: [
    makeSection({ id: SECTION_EXP, type: "experience", title: "Experience" }),
    makeSection({ id: SECTION_SUM, type: "text", title: "Summary" }),
    makeSection({ id: SECTION_SKL, type: "list", title: "Skills" }),
  ],
  detectedProfession: "Engineer",
  detectedCareerLevel: "Senior",
};

const MOCK_REWRITES: Rewrite[] = [
  {
    id: "rw-1",
    sectionId: SECTION_EXP,
    itemId: "item-1",
    field: "bullets.0",
    before: "Did things",
    after: "Spearheaded initiatives",
    rationale: "Stronger verb",
    keywordsAdded: ["leadership"],
    gapClassification: "REWRITTEN",
    accepted: null,
  },
  {
    id: "rw-2",
    sectionId: SECTION_EXP,
    itemId: "item-2",
    field: "bullets.1",
    before: "Used React",
    after: "Built scalable React apps",
    rationale: "More specific",
    keywordsAdded: ["React"],
    gapClassification: "REFRAMED",
    accepted: null,
  },
  {
    id: "rw-3",
    sectionId: SECTION_SUM,
    itemId: "item-3",
    field: "description",
    before: "I am a developer",
    after: "Results-driven engineer",
    rationale: "Professional tone",
    keywordsAdded: [],
    gapClassification: "REWRITTEN",
    accepted: true,
  },
  {
    id: "rw-4",
    sectionId: SECTION_SKL,
    itemId: "item-4",
    field: "items.0",
    before: "JavaScript",
    after: "JavaScript / TypeScript",
    rationale: "Add TypeScript",
    keywordsAdded: ["TypeScript"],
    gapClassification: "MISSING",
    accepted: null,
  },
];

function setupStore() {
  useResumeEditorStore.getState().initialize(MOCK_DOC, MOCK_REWRITES);
}

beforeEach(() => {
  useResumeEditorStore.getState().resetEditor();
});

describe("EditorSidebar", () => {
  it("renders all sections from sectionOrder", () => {
    setupStore();
    render(<EditorSidebar />);

    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
  });

  it("renders sections in display order", () => {
    setupStore();
    render(<EditorSidebar />);

    const rows = screen.getAllByTestId(/^section-row-/);
    expect(rows[0]).toHaveAttribute("data-testid", `section-row-${SECTION_EXP}`);
    expect(rows[1]).toHaveAttribute("data-testid", `section-row-${SECTION_SUM}`);
    expect(rows[2]).toHaveAttribute("data-testid", `section-row-${SECTION_SKL}`);
  });

  it("highlights the active section", () => {
    setupStore();
    useResumeEditorStore.getState().setActiveSection(SECTION_SUM);
    render(<EditorSidebar />);

    const row = screen.getByTestId(`section-row-${SECTION_SUM}`);
    expect(row).toHaveAttribute("data-active", "true");
  });

  it("sets active section on click", () => {
    setupStore();
    render(<EditorSidebar />);

    fireEvent.click(
      screen.getByRole("button", { name: /select experience section/i }),
    );

    expect(useResumeEditorStore.getState().activeSectionId).toBe(SECTION_EXP);
  });

  it("shows badge with pending rewrite count", () => {
    setupStore();
    render(<EditorSidebar />);

    // Experience: 2 pending
    expect(screen.getByTestId(`badge-${SECTION_EXP}`)).toHaveTextContent("2");

    // Summary: 0 pending (rw-3 accepted)
    expect(screen.queryByTestId(`badge-${SECTION_SUM}`)).not.toBeInTheDocument();

    // Skills: 1 pending
    expect(screen.getByTestId(`badge-${SECTION_SKL}`)).toHaveTextContent("1");
  });

  it("does not show badge when no pending rewrites", () => {
    setupStore();
    render(<EditorSidebar />);

    expect(screen.queryByTestId(`badge-${SECTION_SUM}`)).not.toBeInTheDocument();
  });

  it("moves section up when up button is clicked", () => {
    setupStore();
    render(<EditorSidebar />);

    fireEvent.click(
      screen.getByRole("button", { name: /move summary section up/i }),
    );

    expect(useResumeEditorStore.getState().sectionOrder).toEqual([
      SECTION_SUM,
      SECTION_EXP,
      SECTION_SKL,
    ]);
  });

  it("moves section down when down button is clicked", () => {
    setupStore();
    render(<EditorSidebar />);

    fireEvent.click(
      screen.getByRole("button", { name: /move experience section down/i }),
    );

    expect(useResumeEditorStore.getState().sectionOrder).toEqual([
      SECTION_SUM,
      SECTION_EXP,
      SECTION_SKL,
    ]);
  });

  it("disables up button for first section", () => {
    setupStore();
    render(<EditorSidebar />);

    expect(
      screen.getByRole("button", { name: /move experience section up/i }),
    ).toBeDisabled();
  });

  it("disables down button for last section", () => {
    setupStore();
    render(<EditorSidebar />);

    expect(
      screen.getByRole("button", { name: /move skills section down/i }),
    ).toBeDisabled();
  });

  it("renders nothing when no document is loaded", () => {
    render(<EditorSidebar />);
    expect(screen.queryByTestId(/^section-row-/)).toBeNull();
  });
});

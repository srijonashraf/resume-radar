import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStore } from "../../../store/useStore";
import { useResumeEditorStore } from "../../../store/useResumeEditorStore";
import type { ExtractionResult, Rewrite } from "@resumetra/shared";

// ── Mock child components ──────────────────────────────────────────────

vi.mock("../EditorToolbar", () => ({
  default: () => <div data-testid="editor-toolbar">EditorToolbar</div>,
}));

vi.mock("../EditorSidebar", () => ({
  default: () => <div data-testid="editor-sidebar">EditorSidebar</div>,
}));

vi.mock("../LivePreview", () => ({
  LivePreview: () => <div data-testid="live-preview">LivePreview</div>,
}));

vi.mock("../sections/ExperienceEditor", () => ({
  default: ({ section }: { section: { id: string } }) => (
    <div data-testid="experience-editor">ExperienceEditor:{section.id}</div>
  ),
}));

vi.mock("../sections/TextSectionEditor", () => ({
  default: ({ section }: { section: { id: string } }) => (
    <div data-testid="text-editor">TextSectionEditor:{section.id}</div>
  ),
}));

vi.mock("../sections/SkillsEditor", () => ({
  SkillsEditor: ({ section }: { section: { id: string } }) => (
    <div data-testid="skills-editor">SkillsEditor:{section.id}</div>
  ),
}));

vi.mock("../sections/EducationEditor", () => ({
  EducationEditor: ({ section }: { section: { id: string } }) => (
    <div data-testid="education-editor">EducationEditor:{section.id}</div>
  ),
}));

vi.mock("../sections/CustomSectionEditor", () => ({
  CustomSectionEditor: ({ section }: { section: { id: string } }) => (
    <div data-testid="custom-editor">CustomSectionEditor:{section.id}</div>
  ),
}));

// Import after mocks so the component gets the mocked children
import ResumeEditorPanel from "../ResumeEditorPanel";

// ── Fixtures ───────────────────────────────────────────────────────────

const SECTION_EXP = "sec-experience";
const SECTION_SUM = "sec-summary";
const SECTION_SKL = "sec-skills";
const SECTION_EDU = "sec-education";
const SECTION_CUST = "sec-custom";

const MOCK_EXTRACTION: ExtractionResult = {
  document: {
    contact: {
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "555-1234",
      location: "San Francisco",
      linkedin: null,
      github: null,
      portfolio: null,
    },
    sections: [
      {
        id: SECTION_EXP,
        type: "experience",
        title: "Experience",
        displayOrder: 0,
        items: [
          {
            id: "item-1",
            heading: "Software Engineer",
            subheading: "Acme Corp",
            dateRange: "2020 - 2023",
            bullets: ["Built things"],
          },
        ],
      },
      {
        id: SECTION_SUM,
        type: "text",
        title: "Summary",
        displayOrder: 1,
        items: [{ id: "item-2", description: "A developer" }],
      },
      {
        id: SECTION_SKL,
        type: "list",
        title: "Skills",
        displayOrder: 2,
        items: [{ id: "item-3", items: ["React", "TypeScript"] }],
      },
      {
        id: SECTION_EDU,
        type: "table",
        title: "Education",
        displayOrder: 3,
        items: [
          {
            id: "item-4",
            rows: [{ degree: "BS", institution: "MIT", year: "2020" }],
          },
        ],
      },
      {
        id: SECTION_CUST,
        type: "raw",
        title: "Projects",
        displayOrder: 4,
        items: [{ id: "item-5", rawText: "Custom content" }],
      },
    ],
    detectedProfession: "Software Engineer",
    detectedCareerLevel: "Mid",
  },
  profession: { professionId: "se-1", confidence: 0.95 },
  careerLevel: { levelId: "mid", label: "Mid-Level", totalMonths: 48 },
  sectionCoverage: {
    required: [],
    recommended: [],
    optional: [],
  },
};

const MOCK_REWRITES: Rewrite[] = [
  {
    id: "rw-1",
    sectionId: SECTION_EXP,
    itemId: "item-1",
    field: "bullets.0",
    before: "Built things",
    after: "Architected scalable systems",
    rationale: "Stronger impact",
    keywordsAdded: ["architecture"],
    gapClassification: "REWRITTEN",
    accepted: null,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────

function seedPipelineStore() {
  useStore.setState({
    extractionResult: MOCK_EXTRACTION,
    tailorRewrites: MOCK_REWRITES,
  } as Partial<Parameters<typeof useStore.setState>[0]>);
}

beforeEach(() => {
  useResumeEditorStore.getState().resetEditor();
  useStore.setState({
    extractionResult: null,
    tailorRewrites: [],
  } as Partial<Parameters<typeof useStore.setState>[0]>);
});

// ── Tests ──────────────────────────────────────────────────────────────

describe("ResumeEditorPanel", () => {
  // ── Layout ───────────────────────────────────────────────────────────

  it("renders split-pane layout with both panes", () => {
    seedPipelineStore();
    render(<ResumeEditorPanel />);

    expect(screen.getByTestId("editor-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("editor-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("live-preview")).toBeInTheDocument();
  });

  // ── Section editor routing ───────────────────────────────────────────

  it("renders ExperienceEditor for experience section type", () => {
    seedPipelineStore();
    render(<ResumeEditorPanel />);

    // First section is experience (default after initialize)
    expect(screen.getByTestId("experience-editor")).toHaveTextContent(
      `ExperienceEditor:${SECTION_EXP}`,
    );
  });

  it("renders TextSectionEditor for text section type", () => {
    seedPipelineStore();
    render(<ResumeEditorPanel />);

    // Switch after mount so the useEffect initialize doesn't override
    act(() => {
      useResumeEditorStore.getState().setActiveSection(SECTION_SUM);
    });

    expect(screen.getByTestId("text-editor")).toHaveTextContent(
      `TextSectionEditor:${SECTION_SUM}`,
    );
  });

  it("renders SkillsEditor for list section type", () => {
    seedPipelineStore();
    render(<ResumeEditorPanel />);

    act(() => {
      useResumeEditorStore.getState().setActiveSection(SECTION_SKL);
    });

    expect(screen.getByTestId("skills-editor")).toHaveTextContent(
      `SkillsEditor:${SECTION_SKL}`,
    );
  });

  it("renders EducationEditor for table section type", () => {
    seedPipelineStore();
    render(<ResumeEditorPanel />);

    act(() => {
      useResumeEditorStore.getState().setActiveSection(SECTION_EDU);
    });

    expect(screen.getByTestId("education-editor")).toHaveTextContent(
      `EducationEditor:${SECTION_EDU}`,
    );
  });

  it("renders CustomSectionEditor for raw section type", () => {
    seedPipelineStore();
    render(<ResumeEditorPanel />);

    act(() => {
      useResumeEditorStore.getState().setActiveSection(SECTION_CUST);
    });

    expect(screen.getByTestId("custom-editor")).toHaveTextContent(
      `CustomSectionEditor:${SECTION_CUST}`,
    );
  });

  // ── Sidebar interaction ──────────────────────────────────────────────

  it("switches section editor when active section changes", () => {
    seedPipelineStore();
    render(<ResumeEditorPanel />);

    // Initially experience
    expect(screen.getByTestId("experience-editor")).toBeInTheDocument();

    // Switch to skills
    act(() => {
      useResumeEditorStore.getState().setActiveSection(SECTION_SKL);
    });

    expect(screen.getByTestId("skills-editor")).toBeInTheDocument();
    expect(screen.queryByTestId("experience-editor")).not.toBeInTheDocument();
  });

  // ── Store initialization ─────────────────────────────────────────────

  it("initializes editor store from pipeline data on mount", () => {
    seedPipelineStore();
    render(<ResumeEditorPanel />);

    const state = useResumeEditorStore.getState();
    expect(state.sourceDocument).not.toBeNull();
    expect(state.sourceDocument!.contact.fullName).toBe("Jane Doe");
    expect(state.sourceDocument!.sections).toHaveLength(5);
  });

  it("passes rewrites to editor store on initialization", () => {
    seedPipelineStore();
    render(<ResumeEditorPanel />);

    const state = useResumeEditorStore.getState();
    expect(state.rewrites).toHaveLength(1);
    expect(state.rewrites[0].id).toBe("rw-1");
  });

  it("sets initial activeSectionId to first section", () => {
    seedPipelineStore();
    render(<ResumeEditorPanel />);

    expect(useResumeEditorStore.getState().activeSectionId).toBe(SECTION_EXP);
  });

  // ── Edge cases ───────────────────────────────────────────────────────

  it("renders nothing when no pipeline data and no editor data", () => {
    // Neither pipeline store nor editor store has data
    render(<ResumeEditorPanel />);

    // Toolbar and sidebar still render (they handle null internally),
    // but no section editor should appear
    expect(screen.queryByTestId("experience-editor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("text-editor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("skills-editor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("education-editor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("custom-editor")).not.toBeInTheDocument();
  });

  it("re-initializes when pipeline data changes", () => {
    seedPipelineStore();
    render(<ResumeEditorPanel />);

    // Verify initial state
    expect(useResumeEditorStore.getState().sourceDocument!.sections).toHaveLength(5);

    // Simulate pipeline update with different data
    const updatedExtraction: ExtractionResult = {
      ...MOCK_EXTRACTION,
      document: {
        ...MOCK_EXTRACTION.document,
        sections: [
          {
            id: "new-sec-1",
            type: "text",
            title: "New Section",
            displayOrder: 0,
            items: [{ id: "new-item-1", description: "New content" }],
          },
        ],
      },
    };
    act(() => {
      useStore.setState({
        extractionResult: updatedExtraction,
      } as Partial<Parameters<typeof useStore.setState>[0]>);
    });

    expect(useResumeEditorStore.getState().sourceDocument!.sections).toHaveLength(1);
    expect(useResumeEditorStore.getState().activeSectionId).toBe("new-sec-1");
  });
});

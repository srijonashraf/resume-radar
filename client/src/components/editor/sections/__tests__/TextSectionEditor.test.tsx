import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useResumeEditorStore } from "../../../../store/useResumeEditorStore";
import type { ResumeDocument, DynamicSection } from "@resumetra/shared";
import TextSectionEditor from "../TextSectionEditor";

// ── Fixtures ────────────────────────────────────────────────────────────

function makeTextSection(overrides?: Partial<DynamicSection>): DynamicSection {
  return {
    id: "summary-1",
    type: "text",
    title: "Professional Summary",
    displayOrder: 1,
    items: [
      {
        id: "item-summary",
        description:
          "Experienced software engineer with a passion for building scalable applications.",
      },
    ],
    ...overrides,
  };
}

function makeDocument(sections: DynamicSection[] = []): ResumeDocument {
  return {
    contact: {
      fullName: "Test User",
      email: "test@example.com",
      phone: "555-0000",
      location: "New York",
      linkedin: null,
      github: null,
      portfolio: null,
    },
    sections,
    detectedProfession: "Software Engineer",
    detectedCareerLevel: "Mid-Level",
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("TextSectionEditor", () => {
  beforeEach(() => {
    useResumeEditorStore.getState().resetEditor();
  });

  it("renders a textarea with the description text", () => {
    const section = makeTextSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<TextSectionEditor section={section} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(
      "Experienced software engineer with a passion for building scalable applications.",
    );
  });

  it("renders the section title", () => {
    const section = makeTextSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<TextSectionEditor section={section} />);

    expect(screen.getByText("Professional Summary")).toBeInTheDocument();
  });

  it("dispatches setUserEdit with correct key when typing", () => {
    const section = makeTextSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<TextSectionEditor section={section} />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "New summary text" } });

    expect(
      useResumeEditorStore.getState().userEdits.get(
        "summary-1.item-summary.description",
      ),
    ).toBe("New summary text");
  });

  it("shows green word count indicator for under 50 words", () => {
    const section = makeTextSection({
      items: [
        {
          id: "item-summary",
          description: "Short summary with just a few words.",
        },
      ],
    });
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<TextSectionEditor section={section} />);

    const indicator = screen.getByTestId("word-count-indicator");
    expect(indicator).toHaveAttribute("data-word-count-level", "green");
  });

  it("shows amber word count indicator for 50-75 words", () => {
    const words = Array(60).fill("word").join(" ");
    const section = makeTextSection({
      items: [
        {
          id: "item-summary",
          description: words,
        },
      ],
    });
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<TextSectionEditor section={section} />);

    const indicator = screen.getByTestId("word-count-indicator");
    expect(indicator).toHaveAttribute("data-word-count-level", "amber");
  });

  it("shows red word count indicator for over 75 words", () => {
    const words = Array(80).fill("word").join(" ");
    const section = makeTextSection({
      items: [
        {
          id: "item-summary",
          description: words,
        },
      ],
    });
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<TextSectionEditor section={section} />);

    const indicator = screen.getByTestId("word-count-indicator");
    expect(indicator).toHaveAttribute("data-word-count-level", "red");
  });

  it("updates word count when text changes", () => {
    const section = makeTextSection({
      items: [
        {
          id: "item-summary",
          description: "Short text.",
        },
      ],
    });
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<TextSectionEditor section={section} />);

    // Initially green
    const indicator = screen.getByTestId("word-count-indicator");
    expect(indicator).toHaveAttribute("data-word-count-level", "green");

    // Change to a long text
    const textarea = screen.getByRole("textbox");
    const longText = Array(80).fill("word").join(" ");
    fireEvent.change(textarea, { target: { value: longText } });

    expect(indicator).toHaveAttribute("data-word-count-level", "red");
  });

  it("displays the actual word count number", () => {
    const section = makeTextSection({
      items: [
        {
          id: "item-summary",
          description: "one two three four five",
        },
      ],
    });
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<TextSectionEditor section={section} />);

    expect(screen.getByText(/5\s*words/i)).toBeInTheDocument();
  });
});

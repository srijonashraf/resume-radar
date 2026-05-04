import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useResumeEditorStore } from "../../../store/useResumeEditorStore";
import type { ResumeDocument, DynamicSection } from "@resumetra/shared";

// ── Mock template components ───────────────────────────────────────────

vi.mock(
  "../../pdf/templates/professionalTemplatePreview",
  () => ({
    ProfessionalTemplatePreview: ({
      data,
    }: {
      data: Record<string, unknown>;
    }) => (
      <div data-testid="professional-template" data-name={data.name}>
        Professional:{data.name}
      </div>
    ),
  }),
);

vi.mock(
  "../../pdf/templates/modernTemplatePreview",
  () => ({
    ModernTemplatePreview: ({
      data,
    }: {
      data: Record<string, unknown>;
    }) => (
      <div data-testid="modern-template" data-name={data.name}>
        Modern:{data.name}
      </div>
    ),
  }),
);

import { LivePreview } from "../LivePreview";

// ── Fixtures ───────────────────────────────────────────────────────────

const SECTION_EXP = "sec-exp";
const SECTION_SUM = "sec-summary";
const SECTION_SKL = "sec-skills";

function makeSection(
  overrides: Partial<DynamicSection> & {
    id: string;
    type: DynamicSection["type"];
  },
): DynamicSection {
  return { title: "Section", displayOrder: 0, items: [], ...overrides };
}

function makeMockDoc(overrides?: Partial<ResumeDocument>): ResumeDocument {
  return {
    contact: {
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "555-1234",
      location: "San Francisco, CA",
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
            id: "exp-1",
            heading: "Acme Corp",
            subheading: "Senior Engineer",
            dateRange: "2022 - Present",
            bullets: ["Led team of 5 engineers", "Shipped product v2.0"],
          },
        ],
      }),
      makeSection({
        id: SECTION_SUM,
        type: "text",
        title: "Summary",
        items: [{ id: "sum-1", description: "Experienced software engineer" }],
      }),
      makeSection({
        id: SECTION_SKL,
        type: "list",
        title: "Skills",
        items: [{ id: "skl-1", items: ["TypeScript", "React", "Node.js"] }],
      }),
    ],
    detectedProfession: "Software Engineer",
    detectedCareerLevel: "Senior",
    ...overrides,
  };
}

beforeEach(() => {
  useResumeEditorStore.getState().resetEditor();
});

// ── Tests ──────────────────────────────────────────────────────────────

describe("LivePreview", () => {
  it("renders professional template by default", () => {
    const doc = makeMockDoc();
    useResumeEditorStore.getState().initialize(doc);

    render(<LivePreview />);

    expect(screen.getByTestId("professional-template")).toBeInTheDocument();
    expect(screen.queryByTestId("modern-template")).not.toBeInTheDocument();
  });

  it("renders modern template when selected", () => {
    const doc = makeMockDoc();
    useResumeEditorStore.getState().initialize(doc);
    useResumeEditorStore.getState().setTemplate("modern");

    render(<LivePreview />);

    expect(screen.getByTestId("modern-template")).toBeInTheDocument();
    expect(screen.queryByTestId("professional-template")).not.toBeInTheDocument();
  });

  it("passes resolved document name to template", () => {
    const doc = makeMockDoc();
    useResumeEditorStore.getState().initialize(doc);

    render(<LivePreview />);

    const template = screen.getByTestId("professional-template");
    expect(template).toHaveAttribute("data-name", "Jane Doe");
  });

  it("reflects name changes from resolved document", () => {
    const doc = makeMockDoc();
    useResumeEditorStore.getState().initialize(doc);

    // Apply a user edit to change the name via the contact heading field
    // Since the mapper reads contact.fullName, we need to modify source directly
    const updatedDoc = makeMockDoc({
      contact: {
        fullName: "John Smith",
        email: "john@example.com",
        phone: "555-5678",
        location: "New York, NY",
        linkedin: null,
        github: null,
        portfolio: null,
      },
    });
    useResumeEditorStore.getState().initialize(updatedDoc);

    render(<LivePreview />);

    const template = screen.getByTestId("professional-template");
    expect(template).toHaveAttribute("data-name", "John Smith");
  });

  it("reflects section reorder in rendered data", () => {
    const doc = makeMockDoc();
    useResumeEditorStore.getState().initialize(doc);

    // Reorder: skills comes first, then summary, then experience
    useResumeEditorStore.getState().reorderSection(SECTION_SKL, 0);

    const { container } = render(<LivePreview />);

    // The template receives sectionOrder in its data.sectionOrder prop.
    // We can verify via the rendered template mock's data attribute.
    // Since our mock doesn't expose sectionOrder, we verify the template rendered.
    expect(screen.getByTestId("professional-template")).toBeInTheDocument();

    // More thorough: verify the resolved document's section order is correct
    const resolved = useResumeEditorStore.getState().getResolvedDocument();
    expect(resolved!.sections[0].id).toBe(SECTION_SKL);
  });

  it("shows placeholder when no document is loaded", () => {
    render(<LivePreview />);

    expect(screen.getByText(/no document loaded/i)).toBeInTheDocument();
    expect(screen.queryByTestId("professional-template")).not.toBeInTheDocument();
    expect(screen.queryByTestId("modern-template")).not.toBeInTheDocument();
  });

  it("switches template when selectedTemplate changes", () => {
    const doc = makeMockDoc();
    useResumeEditorStore.getState().initialize(doc);

    const { rerender } = render(<LivePreview />);

    // Initially professional
    expect(screen.getByTestId("professional-template")).toBeInTheDocument();

    // Switch to modern
    useResumeEditorStore.getState().setTemplate("modern");
    rerender(<LivePreview />);

    expect(screen.getByTestId("modern-template")).toBeInTheDocument();
    expect(screen.queryByTestId("professional-template")).not.toBeInTheDocument();
  });
});

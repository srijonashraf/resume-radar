import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomSectionEditor } from "../CustomSectionEditor";
import { useResumeEditorStore } from "../../../../store/useResumeEditorStore";
import type { ResumeDocument, DynamicSection } from "@resumetra/shared";

const mockCustomSection: DynamicSection = {
  id: "custom-1",
  type: "raw",
  title: "Additional Information",
  displayOrder: 3,
  items: [{ id: "custom-item-1", rawText: "Some existing text here." }],
};

function makeDoc(sections: DynamicSection[]): ResumeDocument {
  return {
    contact: { fullName: "Test", email: "t@t.com", phone: "555", location: "NYC", linkedin: null, github: null, portfolio: null },
    sections,
    detectedProfession: "Engineer",
    detectedCareerLevel: "Senior",
  };
}

describe("CustomSectionEditor", () => {
  beforeEach(() => {
    useResumeEditorStore.getState().resetEditor();
    useResumeEditorStore.getState().initialize(makeDoc([mockCustomSection]));
  });

  it("renders the section title", () => {
    render(<CustomSectionEditor section={mockCustomSection} />);
    expect(screen.getByText("Additional Information")).toBeInTheDocument();
  });

  it("renders a textarea", () => {
    render(<CustomSectionEditor section={mockCustomSection} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("pre-fills textarea with rawText value", () => {
    render(<CustomSectionEditor section={mockCustomSection} />);
    expect(screen.getByDisplayValue("Some existing text here.")).toBeInTheDocument();
  });

  it("dispatches setUserEdit with correct key when text changes", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(useResumeEditorStore.getState(), "setUserEdit");

    render(<CustomSectionEditor section={mockCustomSection} />);

    await user.type(screen.getByRole("textbox"), "X");

    expect(spy).toHaveBeenCalledWith("custom-1.custom-item-1.rawText", "Some existing text here.X");
    spy.mockRestore();
  });

  it("shows placeholder for empty rawText", () => {
    const emptySection: DynamicSection = {
      ...mockCustomSection,
      items: [{ id: "custom-item-empty", rawText: "" }],
    };
    useResumeEditorStore.getState().initialize(makeDoc([emptySection]));

    render(<CustomSectionEditor section={emptySection} />);
    expect(screen.getByPlaceholderText(/enter.*content/i)).toBeInTheDocument();
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EducationEditor } from "../EducationEditor";
import { useResumeEditorStore } from "../../../../store/useResumeEditorStore";
import type { ResumeDocument, DynamicSection } from "@resumetra/shared";

const mockEducationSection: DynamicSection = {
  id: "education-1",
  type: "table",
  title: "Education",
  displayOrder: 2,
  items: [
    {
      id: "edu-item-1",
      rows: [{ institution: "MIT", degree: "B.S.", field: "Computer Science", year: "2020" }],
    },
    {
      id: "edu-item-2",
      rows: [{ institution: "Stanford", degree: "M.S.", field: "AI", year: "2022" }],
    },
  ],
};

function makeDoc(sections: DynamicSection[]): ResumeDocument {
  return {
    contact: { fullName: "Test", email: "t@t.com", phone: "555", location: "NYC", linkedin: null, github: null, portfolio: null },
    sections,
    detectedProfession: "Engineer",
    detectedCareerLevel: "Senior",
  };
}

describe("EducationEditor", () => {
  beforeEach(() => {
    useResumeEditorStore.getState().resetEditor();
    useResumeEditorStore.getState().initialize(makeDoc([mockEducationSection]));
  });

  it("renders the section title", () => {
    render(<EducationEditor section={mockEducationSection} />);
    expect(screen.getByText("Education")).toBeInTheDocument();
  });

  it("renders structured fields for each row", () => {
    render(<EducationEditor section={mockEducationSection} />);

    expect(screen.getAllByPlaceholderText(/institution/i)).toHaveLength(2);
    expect(screen.getAllByPlaceholderText(/degree/i)).toHaveLength(2);
    expect(screen.getAllByPlaceholderText(/field/i)).toHaveLength(2);
    expect(screen.getAllByPlaceholderText(/year/i)).toHaveLength(2);
  });

  it("pre-fills fields from row data", () => {
    render(<EducationEditor section={mockEducationSection} />);

    expect(screen.getByDisplayValue("MIT")).toBeInTheDocument();
    expect(screen.getByDisplayValue("B.S.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Computer Science")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2020")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Stanford")).toBeInTheDocument();
    expect(screen.getByDisplayValue("M.S.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2022")).toBeInTheDocument();
  });

  it("dispatches setUserEdit with correct key when editing a field", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(useResumeEditorStore.getState(), "setUserEdit");

    render(<EducationEditor section={mockEducationSection} />);

    const institutionInputs = screen.getAllByPlaceholderText(/institution/i);
    await user.type(institutionInputs[0], "X");

    expect(spy).toHaveBeenCalledWith("education-1.edu-item-1.rows.0.institution", "MITX");
    spy.mockRestore();
  });

  it("renders a remove button for each entry", () => {
    render(<EducationEditor section={mockEducationSection} />);
    expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(2);
  });

  it("dispatches removeEntry when remove button is clicked", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(useResumeEditorStore.getState(), "removeEntry");

    render(<EducationEditor section={mockEducationSection} />);

    await user.click(screen.getAllByRole("button", { name: /remove/i })[0]);
    expect(spy).toHaveBeenCalledWith("education-1", "edu-item-1");
    spy.mockRestore();
  });

  it("dispatches addEntry when add button is clicked", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(useResumeEditorStore.getState(), "addEntry");

    render(<EducationEditor section={mockEducationSection} />);

    await user.click(screen.getByRole("button", { name: /add.*entry/i }));
    expect(spy).toHaveBeenCalledWith("education-1");
    spy.mockRestore();
  });
});

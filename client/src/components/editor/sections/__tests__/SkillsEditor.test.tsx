import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkillsEditor } from "../SkillsEditor";
import { useResumeEditorStore } from "../../../../store/useResumeEditorStore";
import type { ResumeDocument, DynamicSection } from "@resumetra/shared";

const mockSkillsSection: DynamicSection = {
  id: "skills-1",
  type: "list",
  title: "Skills",
  displayOrder: 1,
  items: [
    {
      id: "skills-item-1",
      items: ["JavaScript", "TypeScript", "React", "Node.js"],
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

describe("SkillsEditor", () => {
  beforeEach(() => {
    useResumeEditorStore.getState().resetEditor();
    useResumeEditorStore.getState().initialize(makeDoc([mockSkillsSection]));
  });

  it("renders the section title", () => {
    render(<SkillsEditor section={mockSkillsSection} />);
    expect(screen.getByText("Skills")).toBeInTheDocument();
  });

  it("renders a chip for each skill", () => {
    render(<SkillsEditor section={mockSkillsSection} />);
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("renders a remove button for each skill chip", () => {
    render(<SkillsEditor section={mockSkillsSection} />);
    expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(4);
  });

  it("dispatches clearUserEdit when a skill is removed", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(useResumeEditorStore.getState(), "clearUserEdit");

    render(<SkillsEditor section={mockSkillsSection} />);

    const jsChip = screen.getByText("JavaScript").closest("[data-testid]");
    const jsRemoveBtn = jsChip
      ? within(jsChip as HTMLElement).getByRole("button", { name: /remove/i })
      : screen.getAllByRole("button", { name: /remove/i })[0];

    await user.click(jsRemoveBtn);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("renders a text input to add new skills", () => {
    render(<SkillsEditor section={mockSkillsSection} />);
    expect(screen.getByPlaceholderText(/add.*skill/i)).toBeInTheDocument();
  });

  it("dispatches setUserEdit when adding a skill via Enter key", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(useResumeEditorStore.getState(), "setUserEdit");

    render(<SkillsEditor section={mockSkillsSection} />);

    const input = screen.getByPlaceholderText(/add.*skill/i);
    await user.type(input, "Python{Enter}");

    expect(spy).toHaveBeenCalledWith("skills-1.skills-item-1.items.4", "Python");
    spy.mockRestore();
  });

  it("does not add empty skill on Enter", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(useResumeEditorStore.getState(), "setUserEdit");

    render(<SkillsEditor section={mockSkillsSection} />);

    await user.type(screen.getByPlaceholderText(/add.*skill/i), "{Enter}");

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("clears input after adding a skill", async () => {
    const user = userEvent.setup();
    render(<SkillsEditor section={mockSkillsSection} />);

    const input = screen.getByPlaceholderText(/add.*skill/i);
    await user.type(input, "Python{Enter}");

    expect(input).toHaveValue("");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useResumeEditorStore } from "../../../../store/useResumeEditorStore";
import type { ResumeDocument, DynamicSection } from "@resumetra/shared";
import ExperienceEditor from "../ExperienceEditor";

// ── Fixtures ────────────────────────────────────────────────────────────

function makeExperienceSection(overrides?: Partial<DynamicSection>): DynamicSection {
  return {
    id: "exp-1",
    type: "experience",
    title: "Work Experience",
    displayOrder: 1,
    items: [
      {
        id: "item-1",
        heading: "Acme Corp",
        subheading: "Senior Engineer",
        dateRange: "2020 - 2023",
        bullets: [
          "Led a team of 5 engineers to deliver the new platform on time",
          "Improved CI pipeline reducing build times by 40%",
        ],
      },
      {
        id: "item-2",
        heading: "Beta Inc",
        subheading: "Junior Developer",
        dateRange: "2018 - 2020",
        bullets: ["Built REST APIs for internal tools"],
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
    },
    sections,
    detectedProfession: "Software Engineer",
    detectedCareerLevel: "Mid-Level",
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("ExperienceEditor", () => {
  beforeEach(() => {
    useResumeEditorStore.getState().resetEditor();
  });

  it("renders entry fields for each item", () => {
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2020 - 2023")).toBeInTheDocument();

    expect(screen.getByDisplayValue("Beta Inc")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Junior Developer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2018 - 2020")).toBeInTheDocument();
  });

  it("renders all bullets for each item", () => {
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    expect(
      screen.getByDisplayValue(
        "Led a team of 5 engineers to deliver the new platform on time",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Improved CI pipeline reducing build times by 40%"),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Built REST APIs for internal tools"),
    ).toBeInTheDocument();
  });

  it("dispatches setUserEdit with correct key when typing in heading", () => {
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    const headingInput = screen.getByDisplayValue("Acme Corp");
    fireEvent.change(headingInput, { target: { value: "New Corp" } });

    expect(
      useResumeEditorStore.getState().userEdits.get("exp-1.item-1.heading"),
    ).toBe("New Corp");
  });

  it("dispatches setUserEdit with correct key when typing in subheading", () => {
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    const subheadingInput = screen.getByDisplayValue("Senior Engineer");
    fireEvent.change(subheadingInput, { target: { value: "Staff Engineer" } });

    expect(
      useResumeEditorStore.getState().userEdits.get("exp-1.item-1.subheading"),
    ).toBe("Staff Engineer");
  });

  it("dispatches setUserEdit with correct key when typing in dateRange", () => {
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    const dateInput = screen.getByDisplayValue("2020 - 2023");
    fireEvent.change(dateInput, { target: { value: "2021 - 2024" } });

    expect(
      useResumeEditorStore.getState().userEdits.get("exp-1.item-1.dateRange"),
    ).toBe("2021 - 2024");
  });

  it("dispatches setUserEdit when typing in a bullet", () => {
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    const bulletInput = screen.getByDisplayValue(
      "Led a team of 5 engineers to deliver the new platform on time",
    );
    fireEvent.change(bulletInput, { target: { value: "New bullet text" } });

    expect(
      useResumeEditorStore.getState().userEdits.get("exp-1.item-1.bullets.0"),
    ).toBe("New bullet text");
  });

  it("adds a bullet when add bullet button is clicked", async () => {
    const user = userEvent.setup();
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    const addBulletButtons = screen.getAllByRole("button", { name: /add bullet/i });
    await user.click(addBulletButtons[0]);

    const updatedDoc = useResumeEditorStore.getState().sourceDocument;
    const item = updatedDoc?.sections[0]?.items[0];
    expect(item?.bullets).toHaveLength(3);
    expect(item?.bullets?.[2]).toBe("");
  });

  it("removes a bullet when remove bullet button is clicked", async () => {
    const user = userEvent.setup();
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    const removeBulletButtons = screen.getAllByRole("button", {
      name: /remove bullet/i,
    });
    await user.click(removeBulletButtons[0]);

    const updatedDoc = useResumeEditorStore.getState().sourceDocument;
    const item = updatedDoc?.sections[0]?.items[0];
    expect(item?.bullets).toHaveLength(1);
  });

  it("adds an entry when add entry button is clicked", async () => {
    const user = userEvent.setup();
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    const addEntryButton = screen.getByRole("button", { name: /add entry/i });
    await user.click(addEntryButton);

    const updatedDoc = useResumeEditorStore.getState().sourceDocument;
    expect(updatedDoc?.sections[0]?.items).toHaveLength(3);
  });

  it("removes an entry when remove entry button is clicked", async () => {
    const user = userEvent.setup();
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    const removeEntryButtons = screen.getAllByRole("button", {
      name: /remove entry/i,
    });
    await user.click(removeEntryButtons[0]);

    const updatedDoc = useResumeEditorStore.getState().sourceDocument;
    const items = updatedDoc?.sections[0]?.items ?? [];
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("item-2");
  });

  it("shows green indicator for bullet under 80 chars", () => {
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    const bulletInput = screen.getByDisplayValue("Built REST APIs for internal tools");
    const container = bulletInput.closest("[data-bullet-indicator]");
    expect(container).toHaveAttribute("data-bullet-indicator", "green");
  });

  it("shows amber indicator for bullet between 80 and 120 chars", () => {
    const mediumBullet = "A".repeat(90);
    const section = makeExperienceSection({
      items: [
        {
          id: "item-1",
          heading: "Acme Corp",
          subheading: "Senior Engineer",
          dateRange: "2020 - 2023",
          bullets: [mediumBullet],
        },
      ],
    });
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    const bulletInput = screen.getByDisplayValue(mediumBullet);
    const container = bulletInput.closest("[data-bullet-indicator]");
    expect(container).toHaveAttribute("data-bullet-indicator", "amber");
  });

  it("shows red indicator for bullet over 120 chars", () => {
    const longBullet = "A".repeat(130);
    const section = makeExperienceSection({
      items: [
        {
          id: "item-1",
          heading: "Acme Corp",
          subheading: "Senior Engineer",
          dateRange: "2020 - 2023",
          bullets: [longBullet],
        },
      ],
    });
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    const bulletInput = screen.getByDisplayValue(longBullet);
    const container = bulletInput.closest("[data-bullet-indicator]");
    expect(container).toHaveAttribute("data-bullet-indicator", "red");
  });

  it("renders section title", () => {
    const section = makeExperienceSection();
    const doc = makeDocument([section]);
    useResumeEditorStore.getState().initialize(doc);

    render(<ExperienceEditor section={section} />);

    expect(screen.getByText("Work Experience")).toBeInTheDocument();
  });
});

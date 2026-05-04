import { describe, it, expect } from "vitest";
import { resolvedDocumentToPdfData } from "../resolvedDocumentToPdfData";
import type {
  ResumeDocument,
  DynamicSection,
  SectionItem,
} from "@resumetra/shared";

function makeSection(
  overrides: Partial<DynamicSection> & { type: DynamicSection["type"] },
  items: Partial<SectionItem>[] = [],
): DynamicSection {
  return {
    id: `section-${Math.random().toString(36).slice(2, 8)}`,
    title: overrides.title ?? "Untitled",
    displayOrder: overrides.displayOrder ?? 0,
    ...overrides,
    items: items.map((item, i) => ({
      id: `item-${i}`,
      ...item,
    })),
  };
}

function makeDocument(sections: DynamicSection[]): ResumeDocument {
  return {
    contact: {
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "+1-555-0100",
      location: "New York, NY",
      linkedin: null,
      github: null,
      portfolio: null,
    },
    sections,
    detectedProfession: "Software Engineer",
    detectedCareerLevel: "mid",
  };
}

describe("resolvedDocumentToPdfData", () => {
  it("maps contact info correctly", () => {
    const doc = makeDocument([]);
    const result = resolvedDocumentToPdfData(doc, []);

    expect(result.name).toBe("Jane Doe");
    expect(result.contact).toEqual({
      email: "jane@example.com",
      phone: "+1-555-0100",
      location: "New York, NY",
    });
  });

  it("handles null contact fields as empty strings", () => {
    const doc: ResumeDocument = {
      contact: {
        fullName: null,
        email: null,
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        portfolio: null,
      },
      sections: [],
      detectedProfession: "",
      detectedCareerLevel: "",
    };

    const result = resolvedDocumentToPdfData(doc, []);

    expect(result.name).toBe("");
    expect(result.contact.email).toBe("");
    expect(result.contact.phone).toBe("");
    expect(result.contact.location).toBe("");
  });

  it("maps experience sections to workExperiences", () => {
    const doc = makeDocument([
      makeSection(
        { type: "experience", title: "Work Experience" },
        [
          {
            heading: "Acme Corp",
            subheading: "Senior Engineer",
            dateRange: "2020 – 2023",
            bullets: ["Led team of 5", "Shipped v2.0"],
          },
          {
            heading: "Beta Inc",
            subheading: "Engineer",
            dateRange: "2018 – 2020",
            bullets: ["Built API"],
          },
        ],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["workExperiences"]);

    expect(result.workExperiences).toHaveLength(2);
    expect(result.workExperiences[0]).toEqual({
      company: "Acme Corp",
      title: "Senior Engineer",
      dateRange: "2020 – 2023",
      bullets: ["Led team of 5", "Shipped v2.0"],
    });
    expect(result.workExperiences[1]).toEqual({
      company: "Beta Inc",
      title: "Engineer",
      dateRange: "2018 – 2020",
      bullets: ["Built API"],
    });
  });

  it("maps experience items without optional fields with defaults", () => {
    const doc = makeDocument([
      makeSection(
        { type: "experience", title: "Experience" },
        [{ heading: "Startup" }],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["workExperiences"]);

    expect(result.workExperiences).toHaveLength(1);
    expect(result.workExperiences[0]).toEqual({
      company: "Startup",
      title: "",
      dateRange: "",
      bullets: [],
    });
  });

  it("maps text/summary sections to summary", () => {
    const doc = makeDocument([
      makeSection(
        { type: "text", title: "Professional Summary" },
        [{ description: "Experienced engineer with 5 years of experience." }],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["summary"]);

    expect(result.summary).toBe(
      "Experienced engineer with 5 years of experience.",
    );
  });

  it("recognizes summary by 'objective' keyword", () => {
    const doc = makeDocument([
      makeSection(
        { type: "text", title: "Career Objective" },
        [{ description: "Seeking a challenging role." }],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["summary"]);

    expect(result.summary).toBe("Seeking a challenging role.");
  });

  it("recognizes summary by 'profile' keyword", () => {
    const doc = makeDocument([
      makeSection(
        { type: "text", title: "My Profile" },
        [{ description: "Results-driven professional." }],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["summary"]);

    expect(result.summary).toBe("Results-driven professional.");
  });

  it("concatenates descriptions from multiple summary items", () => {
    const doc = makeDocument([
      makeSection(
        { type: "text", title: "Summary" },
        [
          { description: "Part one." },
          { description: "Part two." },
        ],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["summary"]);

    expect(result.summary).toBe("Part one.\nPart two.");
  });

  it("maps list/skills sections to skills array", () => {
    const doc = makeDocument([
      makeSection(
        { type: "list", title: "Technical Skills" },
        [
          { items: ["TypeScript", "React"] },
          { items: ["Node.js"] },
        ],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["skills"]);

    expect(result.skills).toEqual(["TypeScript", "React", "Node.js"]);
  });

  it("recognizes skills by case-insensitive 'skills' match", () => {
    const doc = makeDocument([
      makeSection(
        { type: "list", title: "KEY SKILLS" },
        [{ items: ["Python"] }],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["skills"]);

    expect(result.skills).toEqual(["Python"]);
  });

  it("maps table/education sections to education", () => {
    const doc = makeDocument([
      makeSection(
        { type: "table", title: "Education" },
        [
          {
            rows: [
              {
                institution: "MIT",
                degree: "B.S.",
                field: "Computer Science",
                year: "2018",
              },
            ],
          },
          {
            rows: [
              {
                institution: "Stanford",
                degree: "M.S.",
                field: "AI",
                year: "2020",
              },
            ],
          },
        ],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["education"]);

    expect(result.education).toHaveLength(2);
    expect(result.education[0]).toEqual({
      institution: "MIT",
      degree: "B.S.",
      field: "Computer Science",
      year: "2018",
    });
    expect(result.education[1]).toEqual({
      institution: "Stanford",
      degree: "M.S.",
      field: "AI",
      year: "2020",
    });
  });

  it("handles education rows with missing fields as empty strings", () => {
    const doc = makeDocument([
      makeSection(
        { type: "table", title: "Education" },
        [
          {
            rows: [{ institution: "Harvard" }],
          },
        ],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["education"]);

    expect(result.education).toHaveLength(1);
    expect(result.education[0]).toEqual({
      institution: "Harvard",
      degree: "",
      field: "",
      year: "",
    });
  });

  it("maps unmatched sections to additionalSections", () => {
    const doc = makeDocument([
      makeSection(
        { type: "text", title: "Interests" },
        [{ description: "Hiking, photography" }],
      ),
      makeSection(
        { type: "list", title: "Hobbies" },
        [{ items: ["Reading", "Gaming"] }],
      ),
    ]);

    const result = resolvedDocumentToPdfData(
      doc,
      ["additional:Interests", "additional:Hobbies"],
    );

    expect(result.additionalSections).toHaveLength(2);
    expect(result.additionalSections![0]).toEqual({
      title: "Interests",
      content: "Hiking, photography",
    });
    expect(result.additionalSections![1]).toEqual({
      title: "Hobbies",
      content: "Reading, Gaming",
    });
  });

  it("omits additionalSections when all sections are matched", () => {
    const doc = makeDocument([
      makeSection(
        { type: "text", title: "Summary" },
        [{ description: "A summary." }],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["summary"]);

    expect(result.additionalSections).toBeUndefined();
  });

  it("respects sectionOrder", () => {
    const doc = makeDocument([
      makeSection(
        { type: "list", title: "Skills" },
        [{ items: ["TypeScript"] }],
      ),
      makeSection(
        { type: "text", title: "Summary" },
        [{ description: "Hello" }],
      ),
      makeSection(
        { type: "experience", title: "Experience" },
        [{ heading: "Co", subheading: "Dev", dateRange: "2020", bullets: [] }],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, [
      "summary",
      "workExperiences",
      "skills",
    ]);

    expect(result.sectionOrder).toEqual([
      "summary",
      "workExperiences",
      "skills",
    ]);
  });

  it("passes sectionOrder through exactly", () => {
    const doc = makeDocument([]);
    const order = ["summary", "skills", "workExperiences", "education"];

    const result = resolvedDocumentToPdfData(doc, order);

    expect(result.sectionOrder).toEqual(order);
  });

  it("handles empty sections gracefully", () => {
    const doc = makeDocument([
      makeSection({ type: "experience", title: "Experience" }, []),
      makeSection({ type: "text", title: "Summary" }, []),
      makeSection({ type: "list", title: "Skills" }, []),
      makeSection({ type: "table", title: "Education" }, []),
    ]);

    const result = resolvedDocumentToPdfData(doc, [
      "summary",
      "workExperiences",
      "skills",
      "education",
    ]);

    expect(result.workExperiences).toEqual([]);
    expect(result.summary).toBeUndefined();
    expect(result.skills).toEqual([]);
    expect(result.education).toEqual([]);
  });

  it("handles empty document with no sections", () => {
    const doc = makeDocument([]);
    const result = resolvedDocumentToPdfData(doc, []);

    expect(result.name).toBe("Jane Doe");
    expect(result.workExperiences).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.sectionOrder).toEqual([]);
    expect(result.additionalSections).toBeUndefined();
  });

  it("does not confuse experience-type sections with other titles", () => {
    const doc = makeDocument([
      makeSection(
        { type: "experience", title: "Volunteer Experience" },
        [
          {
            heading: "Red Cross",
            subheading: "Volunteer",
            dateRange: "2019",
            bullets: ["Organized events"],
          },
        ],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["workExperiences"]);

    expect(result.workExperiences).toHaveLength(1);
    expect(result.workExperiences[0].company).toBe("Red Cross");
  });

  it("only matches text sections for summary (not experience type with summary title)", () => {
    const doc = makeDocument([
      makeSection(
        { type: "experience", title: "Summary" },
        [{ heading: "Some Company", subheading: "Role", dateRange: "2020", bullets: ["Did things"] }],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["workExperiences"]);

    expect(result.summary).toBeUndefined();
    expect(result.workExperiences).toHaveLength(1);
  });

  it("maps table education with multiple rows per item", () => {
    const doc = makeDocument([
      makeSection(
        { type: "table", title: "Education" },
        [
          {
            rows: [
              { institution: "Uni A", degree: "BSc", field: "Math", year: "2015" },
              { institution: "Uni B", degree: "MSc", field: "Physics", year: "2017" },
            ],
          },
        ],
      ),
    ]);

    const result = resolvedDocumentToPdfData(doc, ["education"]);

    expect(result.education).toHaveLength(2);
    expect(result.education[0].institution).toBe("Uni A");
    expect(result.education[1].institution).toBe("Uni B");
  });
});

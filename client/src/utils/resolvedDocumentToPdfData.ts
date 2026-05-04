import type { ResumeDocument, DynamicSection, SectionItem } from "@resumetra/shared";
import type { PdfResumeData } from "../components/pdf/templates/templateTypes";

const SUMMARY_RE = /summary|objective|profile/i;
const SKILLS_RE = /skills/i;
const EDUCATION_RE = /education/i;

function isSummarySection(section: DynamicSection): boolean {
  return section.type === "text" && SUMMARY_RE.test(section.title);
}

function isSkillsSection(section: DynamicSection): boolean {
  return section.type === "list" && SKILLS_RE.test(section.title);
}

function isEducationSection(section: DynamicSection): boolean {
  return section.type === "table" && EDUCATION_RE.test(section.title);
}

function isExperienceSection(section: DynamicSection): boolean {
  return section.type === "experience";
}

function mapExperienceItems(items: SectionItem[]): PdfResumeData["workExperiences"] {
  return items.map((item) => ({
    company: item.heading ?? "",
    title: item.subheading ?? "",
    dateRange: item.dateRange ?? "",
    bullets: item.bullets ?? [],
  }));
}

function mapSummaryItems(items: SectionItem[]): string | undefined {
  const parts = items
    .map((item) => item.description)
    .filter((d): d is string => typeof d === "string" && d.length > 0);

  return parts.length > 0 ? parts.join("\n") : undefined;
}

function mapSkillsItems(items: SectionItem[]): string[] {
  return items.flatMap((item) => item.items ?? []);
}

function mapEducationItems(items: SectionItem[]): PdfResumeData["education"] {
  return items.flatMap((item) =>
    (item.rows ?? []).map((row) => ({
      institution: row.institution ?? "",
      degree: row.degree ?? "",
      field: row.field ?? "",
      year: row.year ?? "",
    })),
  );
}

function formatAdditionalContent(section: DynamicSection): string {
  switch (section.type) {
    case "text":
      return section.items
        .map((item) => item.description)
        .filter((d): d is string => typeof d === "string" && d.length > 0)
        .join("\n");
    case "list":
      return section.items
        .flatMap((item) => item.items ?? [])
        .join(", ");
    case "table":
      return section.items
        .flatMap((item) =>
          (item.rows ?? []).map((row) => Object.values(row).join(" – ")),
        )
        .join("\n");
    case "raw":
      return section.items
        .map((item) => item.rawText)
        .filter((t): t is string => typeof t === "string" && t.length > 0)
        .join("\n");
    case "experience":
      return section.items
        .map((item) => {
          const parts = [item.heading, item.subheading, item.dateRange].filter(
            (p): p is string => typeof p === "string" && p.length > 0,
          );
          const bullets = item.bullets ?? [];
          return [...parts, ...bullets].join("\n");
        })
        .join("\n");
  }
}

export function resolvedDocumentToPdfData(
  resolved: ResumeDocument,
  sectionOrder: string[],
): PdfResumeData {
  const { contact, sections } = resolved;

  let workExperiences: PdfResumeData["workExperiences"] = [];
  let summary: string | undefined;
  let skills: string[] = [];
  let education: PdfResumeData["education"] = [];
  const additionalSections: Array<{ title: string; content: string }> = [];

  for (const section of sections) {
    if (isExperienceSection(section)) {
      workExperiences = mapExperienceItems(section.items);
    } else if (isSummarySection(section)) {
      summary = mapSummaryItems(section.items);
    } else if (isSkillsSection(section)) {
      skills = mapSkillsItems(section.items);
    } else if (isEducationSection(section)) {
      education = mapEducationItems(section.items);
    } else {
      const content = formatAdditionalContent(section);
      if (content.length > 0) {
        additionalSections.push({ title: section.title, content });
      }
    }
  }

  return {
    name: contact.fullName ?? "",
    contact: {
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      location: contact.location ?? "",
    },
    summary,
    workExperiences,
    education,
    projects: [],
    certifications: [],
    skills,
    sectionOrder,
    additionalSections:
      additionalSections.length > 0 ? additionalSections : undefined,
  };
}

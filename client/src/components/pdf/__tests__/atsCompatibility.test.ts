import { describe, it, expect } from "vitest";
import { resolvedDocumentToPdfData } from "../../../utils/resolvedDocumentToPdfData";
import type { ResumeDocument, DynamicSection, SectionItem } from "@resumetra/shared";

/**
 * ATS compatibility test: verify that keywords from the original resume
 * survive the data transformation pipeline (ResumeDocument → PdfResumeData).
 *
 * If all keywords are present in PdfResumeData, they will be present in the
 * rendered PDF — @react-pdf/renderer renders exactly the data it receives.
 */

const ATS_KEYWORDS = [
  "React",
  "TypeScript",
  "Node.js",
  "PostgreSQL",
  "Docker",
  "Kubernetes",
  "CI/CD",
  "AWS",
  "REST API",
  "Agile",
  "GraphQL",
  "Redis",
  "Python",
  "Git",
];

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

function makeAtsTestDocument(): ResumeDocument {
  return {
    contact: {
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "+1-555-0100",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/janedoe",
      github: "github.com/janedoe",
      portfolio: null,
    },
    sections: [
      makeSection(
        { type: "text", title: "Professional Summary" },
        [
          {
            description:
              "Senior Software Engineer with 8 years of experience building scalable systems with React, TypeScript, and Node.js. Expert in AWS, Docker, and CI/CD pipelines.",
          },
        ],
      ),
      makeSection(
        { type: "experience", title: "Work Experience" },
        [
          {
            heading: "TechCorp",
            subheading: "Senior Software Engineer",
            dateRange: "2020 – Present",
            bullets: [
              "Led migration of monolithic application to microservices using Docker and Kubernetes",
              "Built REST API serving 10M+ requests/day with Node.js and PostgreSQL",
              "Implemented CI/CD pipelines reducing deployment time by 60%",
              "Mentored team of 5 junior developers in Agile methodology",
              "Designed GraphQL gateway unifying 8 backend services",
            ],
          },
          {
            heading: "StartupXYZ",
            subheading: "Software Engineer",
            dateRange: "2017 – 2020",
            bullets: [
              "Developed React SPA with TypeScript serving 100K+ daily active users",
              "Optimized PostgreSQL queries reducing P99 latency by 40%",
              "Built real-time notification system with Redis pub/sub",
              "Implemented automated testing achieving 90% code coverage",
            ],
          },
        ],
      ),
      makeSection(
        { type: "list", title: "Technical Skills" },
        [
          { items: ["React", "TypeScript", "Node.js", "Python", "GraphQL"] },
          { items: ["PostgreSQL", "Redis", "AWS", "Docker", "Kubernetes"] },
          { items: ["CI/CD", "Git", "Agile", "REST API"] },
        ],
      ),
      makeSection(
        { type: "table", title: "Education" },
        [
          {
            rows: [
              {
                institution: "UC Berkeley",
                degree: "B.S.",
                field: "Computer Science",
                year: "2017",
              },
            ],
          },
        ],
      ),
    ],
    detectedProfession: "Software Engineer",
    detectedCareerLevel: "senior",
  };
}

function extractAllText(data: Record<string, unknown>): string {
  const parts: string[] = [];

  function walk(value: unknown): void {
    if (typeof value === "string") {
      parts.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) walk(item);
    } else if (value && typeof value === "object") {
      for (const v of Object.values(value as Record<string, unknown>)) {
        walk(v);
      }
    }
  }

  walk(data);
  return parts.join(" ").toLowerCase();
}

describe("ATS Compatibility", () => {
  const doc = makeAtsTestDocument();
  const sectionOrder = [
    "summary",
    "workExperiences",
    "skills",
    "education",
  ];
  const pdfData = resolvedDocumentToPdfData(doc, sectionOrder);
  const allText = extractAllText(pdfData as unknown as Record<string, unknown>);

  it("preserves all ATS keywords through data pipeline", () => {
    const missing: string[] = [];
    for (const keyword of ATS_KEYWORDS) {
      if (!allText.includes(keyword.toLowerCase())) {
        missing.push(keyword);
      }
    }

    expect(missing).toEqual([]);
  });

  it("preserves contact info in output", () => {
    expect(pdfData.name).toBe("Jane Doe");
    expect(pdfData.contact.email).toBe("jane@example.com");
    expect(pdfData.contact.phone).toBe("+1-555-0100");
    expect(pdfData.contact.location).toBe("San Francisco, CA");
  });

  it("preserves experience bullet content", () => {
    const experienceText = pdfData.workExperiences
      .flatMap((w) => w.bullets)
      .join(" ")
      .toLowerCase();

    // Key technical terms in bullets
    expect(experienceText).toContain("docker");
    expect(experienceText).toContain("kubernetes");
    expect(experienceText).toContain("postgresql");
    expect(experienceText).toContain("graphql");
    expect(experienceText).toContain("redis");
    expect(experienceText).toContain("ci/cd");
  });

  it("preserves skills as flat list", () => {
    expect(pdfData.skills).toHaveLength(14);
    expect(pdfData.skills).toContain("React");
    expect(pdfData.skills).toContain("TypeScript");
    expect(pdfData.skills).toContain("PostgreSQL");
    expect(pdfData.skills).toContain("AWS");
  });

  it("preserves education fields", () => {
    expect(pdfData.education).toHaveLength(1);
    expect(pdfData.education[0].institution).toBe("UC Berkeley");
    expect(pdfData.education[0].degree).toBe("B.S.");
    expect(pdfData.education[0].field).toBe("Computer Science");
  });

  it("preserves summary text", () => {
    expect(pdfData.summary).toBeDefined();
    const summaryLower = pdfData.summary!.toLowerCase();
    expect(summaryLower).toContain("react");
    expect(summaryLower).toContain("typescript");
    expect(summaryLower).toContain("node.js");
    expect(summaryLower).toContain("aws");
    expect(summaryLower).toContain("docker");
  });

  it("no text truncation — all bullets present", () => {
    // 5 bullets from TechCorp + 4 from StartupXYZ = 9 total
    const totalBullets = pdfData.workExperiences.reduce(
      (sum, w) => sum + w.bullets.length,
      0,
    );
    expect(totalBullets).toBe(9);
  });

  it("section order is passed through", () => {
    expect(pdfData.sectionOrder).toEqual(sectionOrder);
  });

  it("no duplicate content across sections", () => {
    // Skills appear in skills array AND in bullets — that's expected.
    // But the mapper shouldn't duplicate skills within the skills array itself.
    const uniqueSkills = new Set(pdfData.skills.map((s) => s.toLowerCase()));
    expect(uniqueSkills.size).toBe(pdfData.skills.length);
  });

  it("experience companies and titles preserved", () => {
    expect(pdfData.workExperiences[0].company).toBe("TechCorp");
    expect(pdfData.workExperiences[0].title).toBe("Senior Software Engineer");
    expect(pdfData.workExperiences[0].dateRange).toBe("2020 – Present");
    expect(pdfData.workExperiences[1].company).toBe("StartupXYZ");
    expect(pdfData.workExperiences[1].title).toBe("Software Engineer");
  });
});

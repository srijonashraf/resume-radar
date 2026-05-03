import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SectionScoreCard from "../SectionScoreCard";
import AtsKeywordReport from "../AtsKeywordReport";
import type { SectionScore, AtsReport } from "@resumetra/shared";

describe("SectionScoreCard", () => {
  it("renders section title and scores", () => {
    const section: SectionScore = {
      sectionId: "section-0",
      contentScore: 7,
      impactScore: 6,
      issues: [],
    };

    render(<SectionScoreCard section={section} sectionTitle="Experience" />);

    expect(screen.getByText("Experience")).toBeDefined();
    expect(screen.getByText("7")).toBeDefined();
    expect(screen.getByText("6")).toBeDefined();
  });

  it("renders issue count badge when issues exist", () => {
    const section: SectionScore = {
      sectionId: "section-0",
      contentScore: 5,
      impactScore: 3,
      issues: [
        {
          itemId: "item-0",
          type: "weak_bullet",
          severity: "high",
          description: "Bullet lacks impact",
          suggestion: "Add quantifiable results",
        },
        {
          itemId: "item-1",
          type: "missing_metric",
          severity: "medium",
          description: "No metrics",
          suggestion: "Include numbers",
        },
      ],
    };

    render(<SectionScoreCard section={section} sectionTitle="Experience" />);

    expect(screen.getByText("2 issues")).toBeDefined();
  });

  it("renders singular issue label for single issue", () => {
    const section: SectionScore = {
      sectionId: "section-0",
      contentScore: 5,
      impactScore: 5,
      issues: [
        {
          itemId: null,
          type: "formatting",
          severity: "low",
          description: "Minor issue",
          suggestion: "Fix formatting",
        },
      ],
    };

    render(<SectionScoreCard section={section} sectionTitle="Skills" />);

    expect(screen.getByText("1 issue")).toBeDefined();
  });

  it("does not render issues badge when no issues", () => {
    const section: SectionScore = {
      sectionId: "section-0",
      contentScore: 9,
      impactScore: 8,
      issues: [],
    };

    render(<SectionScoreCard section={section} sectionTitle="Education" />);

    expect(screen.queryByText(/issue/)).toBeNull();
  });

  it("renders View issues expandable when issues exist", () => {
    const section: SectionScore = {
      sectionId: "section-0",
      contentScore: 4,
      impactScore: 3,
      issues: [
        {
          itemId: null,
          type: "weak_bullet",
          severity: "high",
          description: "Needs improvement",
          suggestion: "Use stronger action verbs",
        },
      ],
    };

    render(<SectionScoreCard section={section} sectionTitle="Experience" />);

    expect(screen.getByText("View issues")).toBeDefined();
  });
});

describe("AtsKeywordReport", () => {
  const BASE_REPORT: AtsReport = {
    matchScore: 65,
    resumeKeywords: ["python", "docker", "aws"],
    jdKeywords: ["python", "java", "docker", "kubernetes"],
    matchedKeywords: ["python", "docker"],
    missingKeywords: ["java", "kubernetes"],
    partialMatches: [
      { jdKeyword: "aws", resumeKeyword: "aws", similarity: 0.95 },
    ],
    sectionCoverage: { experience: true, education: false },
  };

  it("renders match score", () => {
    render(<AtsKeywordReport report={BASE_REPORT} />);

    expect(screen.getByText("ATS Keyword Report")).toBeDefined();
    expect(screen.getByText("65%")).toBeDefined();
  });

  it("renders matched keywords section", () => {
    render(<AtsKeywordReport report={BASE_REPORT} />);

    expect(screen.getByText(/Matched Keywords/)).toBeDefined();
    expect(screen.getByText("python")).toBeDefined();
    expect(screen.getByText("docker")).toBeDefined();
  });

  it("renders missing keywords section", () => {
    render(<AtsKeywordReport report={BASE_REPORT} />);

    expect(screen.getByText(/Missing Keywords/)).toBeDefined();
    expect(screen.getByText("java")).toBeDefined();
    expect(screen.getByText("kubernetes")).toBeDefined();
  });

  it("renders partial matches with similarity", () => {
    render(<AtsKeywordReport report={BASE_REPORT} />);

    expect(screen.getByText(/Partial Matches/)).toBeDefined();
    expect(screen.getByText(/aws ≈ aws \(95%\)/)).toBeDefined();
  });

  it("renders section coverage", () => {
    render(<AtsKeywordReport report={BASE_REPORT} />);

    expect(screen.getByText("Section Coverage")).toBeDefined();
    expect(screen.getByText("experience")).toBeDefined();
    expect(screen.getByText("education")).toBeDefined();
  });

  it("omits matched keywords section when empty", () => {
    const report: AtsReport = {
      ...BASE_REPORT,
      matchedKeywords: [],
    };

    render(<AtsKeywordReport report={report} />);

    expect(screen.queryByText(/Matched Keywords/)).toBeNull();
  });

  it("omits missing keywords section when empty", () => {
    const report: AtsReport = {
      ...BASE_REPORT,
      missingKeywords: [],
    };

    render(<AtsKeywordReport report={report} />);

    expect(screen.queryByText(/Missing Keywords/)).toBeNull();
  });

  it("omits partial matches section when empty", () => {
    const report: AtsReport = {
      ...BASE_REPORT,
      partialMatches: [],
    };

    render(<AtsKeywordReport report={report} />);

    expect(screen.queryByText(/Partial Matches/)).toBeNull();
  });
});

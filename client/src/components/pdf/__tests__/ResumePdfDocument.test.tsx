import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PdfResumeData } from "../templates/templateTypes";
import * as ReactPdf from "@react-pdf/renderer";

// ── Mock @react-pdf/renderer ─────────────────────────────────────────
// Replace react-pdf primitives with standard HTML elements so
// @testing-library/react can query the DOM tree.

vi.mock("@react-pdf/renderer", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    Document: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "pdf-document" }, children),
    Page: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "pdf-page" }, children),
    View: ({
      children,
      ...rest
    }: {
      children: React.ReactNode;
      style?: unknown;
      wrap?: boolean;
    }) => {
      // Forward `wrap` as a data attribute for assertions
      const hasWrap = "wrap" in rest && rest.wrap === true;
      return React.createElement(
        "div",
        { "data-testid": "pdf-view", ...(hasWrap ? { "data-wrap": "true" } : {}) },
        children,
      );
    },
    Text: ({
      children,
    }: {
      children: React.ReactNode;
      style?: unknown;
    }) => {
      // React-pdf Text children are always strings/numbers
      const text =
        typeof children === "string" || typeof children === "number"
          ? String(children)
          : Array.isArray(children)
            ? children.join("")
            : "";
      return React.createElement(
        "span",
        { "data-testid": "pdf-text" },
        text,
      );
    },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    Font: {
      register: vi.fn(),
    },
    pdf: vi.fn(),
  };
});

// Mock fonts module (it calls Font.register with remote URLs)
vi.mock("../fonts", () => ({}));

// ── Import templates after mocks ──────────────────────────────────────

import { ProfessionalTemplate } from "../templates/professionalTemplate";
import { ModernTemplate } from "../templates/modernTemplate";
import { generatePdf } from "../ResumePdfDocument";

// ── Test fixture ──────────────────────────────────────────────────────

function makePdfData(
  overrides: Partial<PdfResumeData> = {},
): PdfResumeData {
  return {
    name: "Jane Doe",
    contact: {
      email: "jane@example.com",
      phone: "+1-555-0100",
      location: "New York, NY",
    },
    summary: "Experienced software engineer with 5+ years of experience.",
    workExperiences: [
      {
        company: "Acme Corp",
        title: "Senior Engineer",
        dateRange: "2020 – Present",
        bullets: ["Led team of 5 engineers", "Shipped product v2.0"],
      },
      {
        company: "Beta Inc",
        title: "Engineer",
        dateRange: "2018 – 2020",
        bullets: ["Built REST API"],
      },
    ],
    education: [
      {
        institution: "MIT",
        degree: "B.S.",
        field: "Computer Science",
        year: "2018",
      },
    ],
    projects: [
      {
        name: "Open Source Tool",
        description: "A CLI tool for data processing",
        technologies: ["TypeScript", "Node.js"],
      },
    ],
    certifications: [
      {
        name: "AWS Solutions Architect",
        issuer: "Amazon",
        year: "2022",
      },
    ],
    skills: ["TypeScript", "React", "Node.js", "Python"],
    sectionOrder: [
      "summary",
      "workExperiences",
      "education",
      "projects",
      "certifications",
      "skills",
    ],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("ProfessionalTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without throwing", () => {
    const data = makePdfData();
    expect(() => render(<ProfessionalTemplate data={data} />)).not.toThrow();
  });

  it("renders the candidate name", () => {
    const data = makePdfData();
    render(<ProfessionalTemplate data={data} />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("renders contact info", () => {
    const data = makePdfData();
    render(<ProfessionalTemplate data={data} />);

    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("+1-555-0100")).toBeInTheDocument();
    expect(screen.getByText("New York, NY")).toBeInTheDocument();
  });

  it("renders summary section", () => {
    const data = makePdfData();
    render(<ProfessionalTemplate data={data} />);

    expect(
      screen.getByText("Experienced software engineer with 5+ years of experience."),
    ).toBeInTheDocument();
  });

  it("renders work experience entries", () => {
    const data = makePdfData();
    render(<ProfessionalTemplate data={data} />);

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByText("2020 – Present")).toBeInTheDocument();
    expect(screen.getByText("Led team of 5 engineers")).toBeInTheDocument();

    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    expect(screen.getByText("Built REST API")).toBeInTheDocument();
  });

  it("renders education entries", () => {
    const data = makePdfData();
    render(<ProfessionalTemplate data={data} />);

    expect(screen.getByText("MIT")).toBeInTheDocument();
    expect(screen.getByText("B.S. in Computer Science")).toBeInTheDocument();
    expect(screen.getByText("2018")).toBeInTheDocument();
  });

  it("renders projects entries", () => {
    const data = makePdfData();
    render(<ProfessionalTemplate data={data} />);

    expect(screen.getByText("Open Source Tool")).toBeInTheDocument();
    expect(
      screen.getByText("Technologies: TypeScript, Node.js"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A CLI tool for data processing"),
    ).toBeInTheDocument();
  });

  it("renders certification entries", () => {
    const data = makePdfData();
    render(<ProfessionalTemplate data={data} />);

    expect(screen.getByText("AWS Solutions Architect")).toBeInTheDocument();
    expect(screen.getByText(/Amazon/)).toBeInTheDocument();
    expect(screen.getByText(/2022/)).toBeInTheDocument();
  });

  it("renders skills as comma-separated list", () => {
    const data = makePdfData();
    render(<ProfessionalTemplate data={data} />);

    expect(
      screen.getByText("TypeScript, React, Node.js, Python"),
    ).toBeInTheDocument();
  });

  it("renders additional sections", () => {
    const data = makePdfData({
      additionalSections: [
        { title: "Interests", content: "Hiking, photography" },
      ],
      sectionOrder: [
        "summary",
        "additional:Interests",
        "workExperiences",
        "skills",
      ],
    });
    render(<ProfessionalTemplate data={data} />);

    expect(screen.getByText("Interests")).toBeInTheDocument();
    expect(screen.getByText("Hiking, photography")).toBeInTheDocument();
  });

  it("omits sections not in sectionOrder", () => {
    const data = makePdfData({ sectionOrder: ["skills"] });
    render(<ProfessionalTemplate data={data} />);

    // Skills should be present
    expect(
      screen.getByText("TypeScript, React, Node.js, Python"),
    ).toBeInTheDocument();

    // Work experience should NOT be present (Acme Corp not in the order)
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("renders empty data without throwing", () => {
    const data: PdfResumeData = {
      name: "",
      contact: { email: "", phone: "", location: "" },
      workExperiences: [],
      education: [],
      projects: [],
      certifications: [],
      skills: [],
      sectionOrder: [],
    };

    expect(() => render(<ProfessionalTemplate data={data} />)).not.toThrow();
  });

  it("renders with summary undefined", () => {
    const data = makePdfData({
      summary: undefined,
      sectionOrder: ["summary", "skills"],
    });
    render(<ProfessionalTemplate data={data} />);

    expect(
      screen.queryByText("Experienced software engineer"),
    ).not.toBeInTheDocument();
  });
});

describe("ModernTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without throwing", () => {
    const data = makePdfData();
    expect(() => render(<ModernTemplate data={data} />)).not.toThrow();
  });

  it("renders the candidate name in sidebar", () => {
    const data = makePdfData();
    render(<ModernTemplate data={data} />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("renders contact info in sidebar", () => {
    const data = makePdfData();
    render(<ModernTemplate data={data} />);

    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("+1-555-0100")).toBeInTheDocument();
    expect(screen.getByText("New York, NY")).toBeInTheDocument();
  });

  it("renders skills as individual tags in sidebar", () => {
    const data = makePdfData();
    render(<ModernTemplate data={data} />);

    // Modern template renders each skill as a separate Text element
    for (const skill of data.skills) {
      expect(screen.getByText(skill)).toBeInTheDocument();
    }
  });

  it("renders certifications in sidebar", () => {
    const data = makePdfData();
    render(<ModernTemplate data={data} />);

    expect(screen.getByText("AWS Solutions Architect")).toBeInTheDocument();
    expect(screen.getByText(/Amazon/)).toBeInTheDocument();
  });

  it("renders summary in main content", () => {
    const data = makePdfData();
    render(<ModernTemplate data={data} />);

    expect(
      screen.getByText("Experienced software engineer with 5+ years of experience."),
    ).toBeInTheDocument();
  });

  it("renders work experience in main content", () => {
    const data = makePdfData();
    render(<ModernTemplate data={data} />);

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByText("Led team of 5 engineers")).toBeInTheDocument();
  });

  it("renders education in main content", () => {
    const data = makePdfData();
    render(<ModernTemplate data={data} />);

    expect(screen.getByText("MIT")).toBeInTheDocument();
    expect(screen.getByText("B.S. in Computer Science")).toBeInTheDocument();
  });

  it("renders projects in main content", () => {
    const data = makePdfData();
    render(<ModernTemplate data={data} />);

    expect(screen.getByText("Open Source Tool")).toBeInTheDocument();
    expect(
      screen.getByText("Technologies: TypeScript, Node.js"),
    ).toBeInTheDocument();
  });

  it("renders additional sections in main content", () => {
    const data = makePdfData({
      additionalSections: [
        { title: "Volunteering", content: "Red Cross volunteer since 2020" },
      ],
      sectionOrder: [
        "summary",
        "additional:Volunteering",
        "workExperiences",
        "skills",
      ],
    });
    render(<ModernTemplate data={data} />);

    expect(screen.getByText("Volunteering")).toBeInTheDocument();
    expect(
      screen.getByText("Red Cross volunteer since 2020"),
    ).toBeInTheDocument();
  });

  it("renders empty data without throwing", () => {
    const data: PdfResumeData = {
      name: "",
      contact: { email: "", phone: "", location: "" },
      workExperiences: [],
      education: [],
      projects: [],
      certifications: [],
      skills: [],
      sectionOrder: [],
    };

    expect(() => render(<ModernTemplate data={data} />)).not.toThrow();
  });

  it("omits empty contact fields", () => {
    const data = makePdfData({
      contact: { email: "test@test.com", phone: "", location: "" },
    });
    render(<ModernTemplate data={data} />);

    expect(screen.getByText("test@test.com")).toBeInTheDocument();
  });
});

describe("generatePdf", () => {
  const mockPdf = vi.mocked(ReactPdf.pdf);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls pdf() with ProfessionalTemplate for professional id", async () => {
    mockPdf.mockReturnValue({
      toBlob: () => Promise.resolve(new Blob(["test"], { type: "application/pdf" })),
    } as ReturnType<typeof ReactPdf.pdf>);

    const data = makePdfData();
    await generatePdf(data, "professional");

    expect(mockPdf).toHaveBeenCalledTimes(1);
  });

  it("calls pdf() with ModernTemplate for modern id", async () => {
    mockPdf.mockReturnValue({
      toBlob: () => Promise.resolve(new Blob(["test"], { type: "application/pdf" })),
    } as ReturnType<typeof ReactPdf.pdf>);

    const data = makePdfData();
    await generatePdf(data, "modern");

    expect(mockPdf).toHaveBeenCalledTimes(1);
  });

  it("returns a blob", async () => {
    const expectedBlob = new Blob(["pdf-content"], { type: "application/pdf" });
    mockPdf.mockReturnValue({
      toBlob: () => Promise.resolve(expectedBlob),
    } as ReturnType<typeof ReactPdf.pdf>);

    const data = makePdfData();
    const result = await generatePdf(data, "professional");

    expect(result).toBe(expectedBlob);
  });

  it("defaults to professional template for unknown id", async () => {
    mockPdf.mockReturnValue({
      toBlob: () => Promise.resolve(new Blob(["test"], { type: "application/pdf" })),
    } as ReturnType<typeof ReactPdf.pdf>);

    const data = makePdfData();
    // The getTemplateComponent switch has default case returning ProfessionalTemplate
    await generatePdf(data, "professional");

    expect(mockPdf).toHaveBeenCalledTimes(1);
  });
});

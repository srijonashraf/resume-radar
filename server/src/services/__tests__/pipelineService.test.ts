import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/pdfService.js", () => ({
  extractPdf: vi.fn(),
}));

vi.mock("../../stages/stage0_validate.js", () => ({
  validateResume: vi.fn(),
}));

vi.mock("../../stages/stage1_extract.js", () => ({
  extractResume: vi.fn(),
}));

vi.mock("../../stages/detectProfession.js", () => ({
  detectProfession: vi.fn(),
}));

vi.mock("../../stages/detectCareerLevel.js", () => ({
  detectCareerLevel: vi.fn(),
}));

vi.mock("../../db/sections.js", () => ({
  saveSections: vi.fn(),
  loadAnalysisDocument: vi.fn(),
  saveAnalysisResults: vi.fn(),
}));

vi.mock("../../stages/stage2_metrics.js", () => ({
  computeDeterministicMetrics: vi.fn(),
}));

vi.mock("../../stages/atsScoring.js", () => ({
  computeAtsFormattingScore: vi.fn(),
  computeKeywordMatchScore: vi.fn(),
}));

vi.mock("../../stages/stage3_analysis.js", () => ({
  runAnalysisAgent: vi.fn(),
}));

vi.mock("../../stages/analysisTools.js", () => ({
  extractJdKeywordsTool: {},
  extractJdKeywordsResponseSchema: {},
}));

vi.mock("../../services/aiService.js", () => ({
  callTool: vi.fn(),
}));

import { extractPdf } from "../../services/pdfService.js";
import { validateResume } from "../../stages/stage0_validate.js";
import { extractResume } from "../../stages/stage1_extract.js";
import { detectProfession } from "../../stages/detectProfession.js";
import { detectCareerLevel } from "../../stages/detectCareerLevel.js";
import { saveSections } from "../../db/sections.js";
import { runExtractionPipeline } from "../../services/pipelineService.js";
import type { ResumeDocument } from "@resumetra/shared";

const MOCK_DOCUMENT: ResumeDocument = {
  contact: {
    fullName: "John Doe",
    email: "john@example.com",
    phone: null,
    location: null,
    linkedin: null,
    github: null,
    portfolio: null,
  },
  sections: [
    {
      id: "section-0",
      type: "experience",
      title: "Experience",
      displayOrder: 0,
      items: [
        {
          id: "item-0-0",
          heading: "Google",
          subheading: "Software Engineer",
          dateRange: "2020 – 2023",
          bullets: ["Built stuff"],
        },
      ],
    },
    {
      id: "section-1",
      type: "list",
      title: "Skills",
      displayOrder: 1,
      items: [{ id: "item-1-0", items: ["Python", "Go"] }],
    },
  ],
  detectedProfession: "generic",
  detectedCareerLevel: "all_levels",
};

describe("runExtractionPipeline", () => {
  const sseEvents: Array<{ event: string; data: unknown }> = [];
  const sendSSE = (event: string, data: unknown) => {
    sseEvents.push({ event, data });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sseEvents.length = 0;

    // Default happy path mocks
    vi.mocked(validateResume).mockReturnValue({
      outcome: "VALID",
      message: "Document is a valid resume.",
    });
    vi.mocked(extractResume).mockResolvedValue(MOCK_DOCUMENT);
    vi.mocked(detectProfession).mockReturnValue({
      professionId: "software_engineer",
      confidence: 0.85,
    });
    vi.mocked(detectCareerLevel).mockReturnValue({
      levelId: "mid",
      label: "Mid-Level Engineer",
      totalMonths: 36,
    });
  });

  it("runs the full pipeline with text input", async () => {
    const result = await runExtractionPipeline(
      { text: "Some resume text" },
      sendSSE,
    );

    expect(result.profession.professionId).toBe("software_engineer");
    expect(result.careerLevel.levelId).toBe("mid");
    expect(result.sectionCoverage.required.length).toBeGreaterThan(0);
    expect(result.document.detectedProfession).toBe("software_engineer");
    expect(result.document.detectedCareerLevel).toBe("mid");
  });

  it("runs the full pipeline with PDF input", async () => {
    vi.mocked(extractPdf).mockResolvedValue({
      text: "Extracted PDF text",
      pageCount: 2,
      pageTexts: ["Page 1", "Page 2"],
    });

    const result = await runExtractionPipeline(
      { pdfBuffer: Buffer.from("fake-pdf") },
      sendSSE,
    );

    expect(extractPdf).toHaveBeenCalledWith(Buffer.from("fake-pdf"));
    expect(result.profession.professionId).toBe("software_engineer");
  });

  it("sends SSE events in correct order", async () => {
    // Make extractResume call sendSSE to simulate real behavior
    vi.mocked(extractResume).mockImplementation(async (_text, sseSender) => {
      sseSender("extracting", { sectionName: "contact", index: 0, total: 2 });
      sseSender("extracting", { sectionName: "Experience", index: 1, total: 2 });
      return MOCK_DOCUMENT;
    });

    await runExtractionPipeline({ text: "text" }, sendSSE);

    expect(sseEvents[0].event).toBe("validating");
    expect(sseEvents.some((e) => e.event === "extracting")).toBe(true);
  });

  it("throws on validation failure and sends error SSE", async () => {
    vi.mocked(validateResume).mockReturnValue({
      outcome: "NOT_A_RESUME",
      message: "No contact information found.",
    });

    await expect(
      runExtractionPipeline({ text: "bad text" }, sendSSE),
    ).rejects.toThrow("No contact information found.");

    expect(sseEvents).toContainEqual({
      event: "error",
      data: {
        error: "No contact information found.",
        outcome: "NOT_A_RESUME",
      },
    });
  });

  it("throws when no input provided", async () => {
    await expect(
      runExtractionPipeline({}, sendSSE),
    ).rejects.toThrow("Either pdfBuffer or text must be provided");
  });

  it("computes section coverage from KB", async () => {
    const result = await runExtractionPipeline(
      { text: "text" },
      sendSSE,
    );

    // SWE mid-level: required = contact, experience, skills
    expect(result.sectionCoverage.required.length).toBeGreaterThan(0);
    // "skills" is present in our mock sections
    const skillsCoverage = result.sectionCoverage.required.find(
      (s) => s.name === "skills",
    );
    expect(skillsCoverage?.present).toBe(true);
  });

  it("persists sections for authenticated users", async () => {
    vi.mocked(saveSections).mockResolvedValue("analysis-uuid-123");

    const result = await runExtractionPipeline(
      { text: "text", userId: "user-123", aiModelVersion: "gemini-3.1" },
      sendSSE,
    );

    expect(saveSections).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        sourceType: "text",
        sections: MOCK_DOCUMENT.sections,
        aiModelVersion: "gemini-3.1",
      }),
    );
    expect(result.analysisId).toBe("analysis-uuid-123");
  });

  it("does not persist for unauthenticated users", async () => {
    const result = await runExtractionPipeline(
      { text: "text", userId: null },
      sendSSE,
    );

    expect(saveSections).not.toHaveBeenCalled();
    expect(result.analysisId).toBeUndefined();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock aiService before importing stage1_extract
vi.mock("../../services/aiService.js", () => ({
  callTool: vi.fn(),
}));

import { callTool } from "../../services/aiService.js";
import { extractResume } from "../stage1_extract.js";

const mockCallTool = vi.mocked(callTool);

describe("extractResume", () => {
  const sseEvents: Array<{ event: string; data: unknown }> = [];
  const sendSSE = (event: string, data: unknown) => {
    sseEvents.push({ event, data });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sseEvents.length = 0;
  });

  it("extracts a complete resume with 3 sections", async () => {
    // Step 1: detect_sections returns 3 sections
    mockCallTool.mockResolvedValueOnce({
      data: {
        sections: [
          { title: "Summary", startIndex: 50, endIndex: 200, estimatedType: "text" },
          { title: "Experience", startIndex: 200, endIndex: 600, estimatedType: "experience" },
          { title: "Skills", startIndex: 600, endIndex: 800, estimatedType: "list" },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });

    // Step 2: extract_contact
    mockCallTool.mockResolvedValueOnce({
      data: {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+1-555-123-4567",
        location: "San Francisco, CA",
        linkedin: null,
        github: null,
        portfolio: null,
      },
      usage: { inputTokens: 80, outputTokens: 40, totalTokens: 120 },
    });

    // Step 3: extract_section for each section
    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-0",
        type: "text",
        title: "Summary",
        displayOrder: 0,
        items: [{ description: "Experienced software engineer" }],
      },
      usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
    });

    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-1",
        type: "experience",
        title: "Experience",
        displayOrder: 1,
        items: [
          {
            heading: "Google",
            subheading: "Senior SWE",
            dateRange: "2020 – Present",
            bullets: ["Led team of 8"],
          },
        ],
      },
      usage: { inputTokens: 60, outputTokens: 40, totalTokens: 100 },
    });

    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-2",
        type: "list",
        title: "Skills",
        displayOrder: 2,
        items: [
          { heading: "Languages", items: ["Python", "TypeScript"] },
        ],
      },
      usage: { inputTokens: 40, outputTokens: 20, totalTokens: 60 },
    });

    const rawText = "Some resume text with enough content to extract";
    const result = await extractResume(rawText, sendSSE);

    expect(result.contact.fullName).toBe("John Doe");
    expect(result.sections).toHaveLength(3);
    expect(result.sections[0].id).toBe("section-0");
    expect(result.sections[0].type).toBe("text");
    expect(result.sections[1].items[0].id).toBe("item-1-0");
    expect(result.sections[2].type).toBe("list");
    expect(result.detectedProfession).toBe("generic");
    expect(result.detectedCareerLevel).toBe("all_levels");
  });

  it("falls back to raw when a section extraction fails", async () => {
    // detect_sections
    mockCallTool.mockResolvedValueOnce({
      data: {
        sections: [
          { title: "Summary", startIndex: 0, endIndex: 100, estimatedType: "text" },
          { title: "Problem Section", startIndex: 100, endIndex: 300, estimatedType: "raw" },
          { title: "Skills", startIndex: 300, endIndex: 500, estimatedType: "list" },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });

    // extract_contact
    mockCallTool.mockResolvedValueOnce({
      data: {
        fullName: "Jane",
        email: "jane@test.com",
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        portfolio: null,
      },
      usage: { inputTokens: 80, outputTokens: 40, totalTokens: 120 },
    });

    // Section 0: success
    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-0",
        type: "text",
        title: "Summary",
        displayOrder: 0,
        items: [{ description: "Hello" }],
      },
      usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
    });

    // Section 1: FAIL
    mockCallTool.mockRejectedValueOnce(new Error("AI extraction failed"));

    // Section 2: success (pipeline continues)
    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-2",
        type: "list",
        title: "Skills",
        displayOrder: 2,
        items: [{ items: ["Python"] }],
      },
      usage: { inputTokens: 40, outputTokens: 20, totalTokens: 60 },
    });

    const rawText = "x".repeat(500);
    const result = await extractResume(rawText, sendSSE);

    expect(result.sections).toHaveLength(3);
    expect(result.sections[1].type).toBe("raw");
    expect(result.sections[1].title).toBe("Problem Section");
    expect(result.sections[1].items[0].rawText).toBeTruthy();
    expect(result.sections[2].type).toBe("list");
  });

  it("sends SSE events for each extraction step", async () => {
    mockCallTool.mockResolvedValueOnce({
      data: {
        sections: [
          { title: "Experience", startIndex: 0, endIndex: 200, estimatedType: "experience" },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });

    mockCallTool.mockResolvedValueOnce({
      data: {
        fullName: "Test",
        email: "test@test.com",
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        portfolio: null,
      },
      usage: { inputTokens: 80, outputTokens: 40, totalTokens: 120 },
    });

    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-0",
        type: "experience",
        title: "Experience",
        displayOrder: 0,
        items: [{ heading: "Company" }],
      },
      usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
    });

    await extractResume("resume text", sendSSE);

    // Only 2 SSE events: detection placeholder + 1 section
    expect(sseEvents.length).toBe(2);
    expect(sseEvents[0]).toEqual({
      event: "extracting",
      data: { sectionName: "sections", index: 0, total: 0 },
    });
    expect(sseEvents[1]).toEqual({
      event: "extracting",
      data: { sectionName: "Experience", index: 0, total: 1 },
    });
  });

  it("generates sequential IDs for sections and items", async () => {
    mockCallTool.mockResolvedValueOnce({
      data: {
        sections: [
          { title: "A", startIndex: 0, endIndex: 50, estimatedType: "text" },
          { title: "B", startIndex: 50, endIndex: 100, estimatedType: "list" },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });

    mockCallTool.mockResolvedValueOnce({
      data: {
        fullName: null, email: null, phone: null,
        location: null, linkedin: null, github: null, portfolio: null,
      },
      usage: { inputTokens: 80, outputTokens: 40, totalTokens: 120 },
    });

    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-0",
        type: "text",
        title: "A",
        displayOrder: 0,
        items: [{ description: "text1" }, { description: "text2" }],
      },
      usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
    });

    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-1",
        type: "list",
        title: "B",
        displayOrder: 1,
        items: [{ items: ["x"] }],
      },
      usage: { inputTokens: 40, outputTokens: 20, totalTokens: 60 },
    });

    const result = await extractResume("text", sendSSE);

    expect(result.sections[0].id).toBe("section-0");
    expect(result.sections[0].items[0].id).toBe("item-0-0");
    expect(result.sections[0].items[1].id).toBe("item-0-1");
    expect(result.sections[1].id).toBe("section-1");
    expect(result.sections[1].items[0].id).toBe("item-1-0");
  });

  it("deduplicates semantically identical sections", async () => {
    // AI detects "Profile" and "Summary" as separate sections
    mockCallTool.mockResolvedValueOnce({
      data: {
        sections: [
          { title: "Profile", startIndex: 0, endIndex: 50, estimatedType: "text" },
          { title: "Summary", startIndex: 50, endIndex: 100, estimatedType: "text" },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });

    mockCallTool.mockResolvedValueOnce({
      data: {
        fullName: null, email: null, phone: null,
        location: null, linkedin: null, github: null, portfolio: null,
      },
      usage: { inputTokens: 80, outputTokens: 40, totalTokens: 120 },
    });

    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-0",
        type: "text",
        title: "Profile",
        displayOrder: 0,
        items: [{ description: "Short profile" }],
      },
      usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
    });

    mockCallTool.mockResolvedValueOnce({
      data: {
        sectionId: "section-1",
        type: "text",
        title: "Summary",
        displayOrder: 1,
        items: [{ description: "Detailed summary" }, { description: "More info" }],
      },
      usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
    });

    const result = await extractResume("text", sendSSE);

    // Should be deduplicated to 1 section (Summary wins — more items)
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe("Summary");
    expect(result.sections[0].displayOrder).toBe(0);
  });
});

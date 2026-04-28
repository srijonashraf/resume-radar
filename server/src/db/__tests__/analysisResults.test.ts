import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockQuery, mockRelease, mockPoolQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockPoolQuery: vi.fn(),
}));

vi.mock("../../config/database.js", () => ({
  default: {
    connect: () =>
      Promise.resolve({
        query: mockQuery,
        release: mockRelease,
      }),
    query: mockPoolQuery,
  },
}));

import { saveAnalysisResults, loadAnalysisResults } from "../sections.js";
import type { SectionScore, SectionIssue, AtsReport } from "@resumetra/shared";

const SECTION_ID_DB_0 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SECTION_ID_DB_1 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ANALYSIS_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const MOCK_SECTION_SCORES: SectionScore[] = [
  {
    sectionId: "section-0",
    contentScore: 7.5,
    impactScore: 6.0,
    issues: [
      {
        itemId: "item-0-0",
        type: "weak_verb",
        severity: "medium",
        description: "Uses weak verb",
        suggestion: 'Replace "Helped" with "Led"',
      },
    ],
  },
  {
    sectionId: "section-1",
    contentScore: 8.0,
    impactScore: 9.0,
    issues: [],
  },
];

const MOCK_ATS_REPORT: AtsReport = {
  matchScore: 72,
  resumeKeywords: ["python", "aws"],
  jdKeywords: ["python", "java", "aws"],
  matchedKeywords: ["python", "aws"],
  missingKeywords: ["java"],
  partialMatches: [],
  sectionCoverage: { experience: true, skills: true },
};

const MOCK_KEYWORD_FREQ: Record<string, number> = { python: 3, aws: 2 };

describe("saveAnalysisResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolQuery.mockReset();
  });

  it("saves section scores and ATS keywords in a transaction", async () => {
    // BEGIN
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // SELECT section UUIDs
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: SECTION_ID_DB_0, section_data: [{ id: "section-0" }] },
        { id: SECTION_ID_DB_1, section_data: [{ id: "section-1" }] },
      ],
    });
    // DELETE existing scores
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // DELETE existing ats keywords
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // INSERT section score 0
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // INSERT section score 1
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // INSERT ats keywords
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // COMMIT
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await saveAnalysisResults({
      analysisId: ANALYSIS_ID,
      sectionMetrics: [],
      sectionScores: MOCK_SECTION_SCORES,
      atsReport: MOCK_ATS_REPORT,
      keywordFrequency: MOCK_KEYWORD_FREQ,
    });

    expect(mockQuery.mock.calls[0]![0]).toBe("BEGIN");
    expect(mockQuery.mock.calls.at(-1)![0]).toBe("COMMIT");
    expect(mockRelease).toHaveBeenCalled();

    // Check section score insert uses DB UUID
    const scoreInsert0 = mockQuery.mock.calls[4]!;
    expect(scoreInsert0[1][0]).toBe(SECTION_ID_DB_0);
    expect(scoreInsert0[1][1]).toBe(7.5);
    expect(scoreInsert0[1][2]).toBe(6.0);

    // Check ATS keywords insert
    const atsInsert = mockQuery.mock.calls[6]!;
    expect(atsInsert[1][0]).toBe(ANALYSIS_ID);
    expect(atsInsert[1][1]).toEqual(["python", "aws"]);
  });

  it("skips ATS keywords when atsReport is null", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: SECTION_ID_DB_0, section_data: [{ id: "section-0" }] }],
    }); // SELECT
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE scores
    // No DELETE ats keywords (no ats report)
    mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT score
    mockQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

    await saveAnalysisResults({
      analysisId: ANALYSIS_ID,
      sectionMetrics: [],
      sectionScores: [MOCK_SECTION_SCORES[0]],
      atsReport: null,
      keywordFrequency: {},
    });

    // Should not have an ATS keywords INSERT
    const atsInserts = mockQuery.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("resume_ats_keywords") && c[0].includes("INSERT"),
    );
    expect(atsInserts).toHaveLength(0);
  });

  it("rolls back on error", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockQuery.mockRejectedValueOnce(new Error("DB error")); // SELECT fails
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(
      saveAnalysisResults({
        analysisId: ANALYSIS_ID,
        sectionMetrics: [],
        sectionScores: [],
        atsReport: null,
        keywordFrequency: {},
      }),
    ).rejects.toThrow("DB error");

    const rollbackCall = mockQuery.mock.calls.find(
      (c) => c[0] === "ROLLBACK",
    );
    expect(rollbackCall).toBeTruthy();
    expect(mockRelease).toHaveBeenCalled();
  });

  it("stores issues as JSONB", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: SECTION_ID_DB_0, section_data: [{ id: "section-0" }] }],
    }); // SELECT
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE scores
    mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT score
    mockQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

    await saveAnalysisResults({
      analysisId: ANALYSIS_ID,
      sectionMetrics: [],
      sectionScores: [MOCK_SECTION_SCORES[0]],
      atsReport: null,
      keywordFrequency: {},
    });

    const scoreInsert = mockQuery.mock.calls[3];
    const issuesParam = scoreInsert[1][3]; // 4th param = issues JSONB
    const parsed = JSON.parse(issuesParam);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("weak_verb");
  });
});

describe("loadAnalysisResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolQuery.mockReset();
  });

  it("returns null when no scores exist", async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // section scores query
    mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // ats keywords query

    const result = await loadAnalysisResults(ANALYSIS_ID);
    expect(result).toBeNull();
  });

  it("loads section scores and ats report from DB", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      // Section scores join
      rows: [
        {
          section_data: [{ id: "section-0" }],
          content_score: "7.5",
          impact_score: "6.0",
          issues: JSON.stringify(MOCK_SECTION_SCORES[0].issues),
        },
        {
          section_data: [{ id: "section-1" }],
          content_score: "8.0",
          impact_score: "9.0",
          issues: "[]",
        },
      ],
    });
    mockPoolQuery.mockResolvedValueOnce({
      // ATS keywords
      rows: [
        {
          resume_keywords: ["python", "aws"],
          jd_keywords: ["python", "java", "aws"],
          matched_keywords: ["python", "aws"],
          missing_keywords: ["java"],
          match_score: "72",
          keyword_report: JSON.stringify({
            partialMatches: [],
            sectionCoverage: { experience: true, skills: true },
            keywordFrequency: { python: 3, aws: 2 },
          }),
        },
      ],
    });

    const result = await loadAnalysisResults(ANALYSIS_ID);

    expect(result).not.toBeNull();
    expect(result!.sectionScores).toHaveLength(2);
    expect(result!.sectionScores[0].contentScore).toBe(7.5);
    expect(result!.sectionScores[0].issues).toHaveLength(1);
    expect(result!.atsReport).not.toBeNull();
    expect(result!.atsReport!.matchScore).toBe(72);
    expect(result!.keywordFrequency).toEqual({ python: 3, aws: 2 });
  });

  it("handles null ats report gracefully", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          section_data: [{ id: "section-0" }],
          content_score: "5.0",
          impact_score: "5.0",
          issues: "[]",
        },
      ],
    });
    mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // No ATS keywords row

    const result = await loadAnalysisResults(ANALYSIS_ID);

    expect(result).not.toBeNull();
    expect(result!.atsReport).toBeNull();
  });
});

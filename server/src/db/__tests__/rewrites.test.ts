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

import { saveRewrites, loadRewrites, updateRewriteAcceptance } from "../rewrites.js";
import type { Rewrite } from "@resumetra/shared";

const SECTION_ID_DB_0 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SECTION_ID_DB_1 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ANALYSIS_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const MOCK_REWRITES: Rewrite[] = [
  {
    id: "rewrite-0",
    sectionId: "section-0",
    itemId: "item-0-1",
    field: "bullet",
    before: "Helped with project",
    after: "Led project delivery across 3 teams",
    rationale: "Stronger action verb with quantification",
    keywordsAdded: ["leadership"],
    gapClassification: "REWRITTEN",
    accepted: null,
  },
  {
    id: "rewrite-1",
    sectionId: "section-1",
    itemId: "item-1-0",
    field: "bullet",
    before: "Used Docker",
    after: "Containerized applications with Docker, leveraging Kubernetes orchestration",
    rationale: "User has Docker experience, framing for Kubernetes-adjacent role",
    keywordsAdded: ["containerization", "Kubernetes"],
    gapClassification: "REFRAMED",
    accepted: null,
  },
];

// ── saveRewrites ─────────────────────────────────────────────────

describe("saveRewrites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolQuery.mockReset();
  });

  it("saves rewrites in a transaction with BEGIN/COMMIT", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: SECTION_ID_DB_0, section_data: [{ id: "section-0" }] },
        { id: SECTION_ID_DB_1, section_data: [{ id: "section-1" }] },
      ],
    }); // SELECT section UUIDs
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE existing rewrites
    mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT rewrite 0
    mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT rewrite 1
    mockQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

    await saveRewrites({ analysisId: ANALYSIS_ID, rewrites: MOCK_REWRITES });

    expect(mockQuery.mock.calls[0]![0]).toBe("BEGIN");
    expect(mockQuery.mock.calls.at(-1)![0]).toBe("COMMIT");
    expect(mockRelease).toHaveBeenCalled();
  });

  it("resolves section IDs to DB UUIDs via sectionIdMap", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: SECTION_ID_DB_0, section_data: [{ id: "section-0" }] },
        { id: SECTION_ID_DB_1, section_data: [{ id: "section-1" }] },
      ],
    }); // SELECT
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE
    mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT rewrite 0
    mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT rewrite 1
    mockQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

    await saveRewrites({ analysisId: ANALYSIS_ID, rewrites: MOCK_REWRITES });

    // First INSERT should use DB UUID for section-0
    const insert0 = mockQuery.mock.calls[3]!;
    expect(insert0[1]).toContain(SECTION_ID_DB_0);

    // Second INSERT should use DB UUID for section-1
    const insert1 = mockQuery.mock.calls[4]!;
    expect(insert1[1]).toContain(SECTION_ID_DB_1);
  });

  it("uses DELETE + INSERT upsert pattern", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: SECTION_ID_DB_0, section_data: [{ id: "section-0" }] }],
    }); // SELECT
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE
    mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT
    mockQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

    await saveRewrites({ analysisId: ANALYSIS_ID, rewrites: [MOCK_REWRITES[0]] });

    const deleteCall = mockQuery.mock.calls[2]!;
    expect(deleteCall[0]).toContain("DELETE");
    expect(deleteCall[0]).toContain("resume_tailor_rewrites");
    expect(deleteCall[1]).toContain(ANALYSIS_ID);
  });

  it("stores keywords_added as text array", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: SECTION_ID_DB_0, section_data: [{ id: "section-0" }] }],
    }); // SELECT
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE
    mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT
    mockQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

    await saveRewrites({ analysisId: ANALYSIS_ID, rewrites: [MOCK_REWRITES[0]] });

    const insertCall = mockQuery.mock.calls[3]!;
    // keywords_added should be the array parameter
    const params = insertCall[1] as unknown[];
    expect(params).toContainEqual(["leadership"]);
  });

  it("rolls back on error", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockQuery.mockRejectedValueOnce(new Error("DB error")); // SELECT fails
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(
      saveRewrites({ analysisId: ANALYSIS_ID, rewrites: MOCK_REWRITES }),
    ).rejects.toThrow("DB error");

    const rollbackCall = mockQuery.mock.calls.find(
      (c) => c[0] === "ROLLBACK",
    );
    expect(rollbackCall).toBeTruthy();
    expect(mockRelease).toHaveBeenCalled();
  });

  it("skips rewrites with unrecognized section IDs", async () => {
    const rewriteWithUnknownSection: Rewrite = {
      ...MOCK_REWRITES[0],
      sectionId: "section-99",
    };

    mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: SECTION_ID_DB_0, section_data: [{ id: "section-0" }] }],
    }); // SELECT — only section-0 mapped
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE
    // No INSERT (section-99 not in map)
    mockQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

    await saveRewrites({
      analysisId: ANALYSIS_ID,
      rewrites: [rewriteWithUnknownSection],
    });

    // Only BEGIN, SELECT, DELETE, COMMIT — no INSERT
    const inserts = mockQuery.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("INSERT"),
    );
    expect(inserts).toHaveLength(0);
  });

  it("handles empty rewrites array", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: SECTION_ID_DB_0, section_data: [{ id: "section-0" }] }],
    }); // SELECT
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE
    mockQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

    await saveRewrites({ analysisId: ANALYSIS_ID, rewrites: [] });

    const inserts = mockQuery.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("INSERT"),
    );
    expect(inserts).toHaveLength(0);
  });
});

// ── loadRewrites ──────────────────────────────────────────────────

describe("loadRewrites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolQuery.mockReset();
  });

  it("returns empty array when no rewrites exist", async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    const result = await loadRewrites(ANALYSIS_ID);
    expect(result).toEqual([]);
  });

  it("loads rewrites with section ID reconstruction from join", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "rewrite-uuid-0",
          section_data: [{ id: "section-0" }],
          item_id: "item-0-1",
          field: "bullet",
          before_text: "Helped with project",
          after_text: "Led project delivery",
          rationale: "Stronger verb",
          keywords_added: ["leadership"],
          gap_classification: "REWRITTEN",
          accepted: null,
        },
      ],
    });

    const result = await loadRewrites(ANALYSIS_ID);

    expect(result).toHaveLength(1);
    expect(result[0].sectionId).toBe("section-0");
    expect(result[0].itemId).toBe("item-0-1");
    expect(result[0].keywordsAdded).toEqual(["leadership"]);
    expect(result[0].gapClassification).toBe("REWRITTEN");
    expect(result[0].accepted).toBeNull();
  });

  it("joins resume_sections to reconstruct sectionId", async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    await loadRewrites(ANALYSIS_ID);

    const query = mockPoolQuery.mock.calls[0]![0] as string;
    expect(query).toContain("resume_sections");
    expect(query).toContain("JOIN");
  });
});

// ── updateRewriteAcceptance ───────────────────────────────────────

describe("updateRewriteAcceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolQuery.mockReset();
  });

  it("updates accepted to true", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{
        id: "rewrite-uuid-0",
        accepted: true,
      }],
    });

    const result = await updateRewriteAcceptance("rewrite-uuid-0", true);

    expect(mockPoolQuery.mock.calls[0]![0]).toContain("UPDATE");
    expect(mockPoolQuery.mock.calls[0]![0]).toContain("resume_tailor_rewrites");
    expect(mockPoolQuery.mock.calls[0]![1]).toContain(true);
    expect(mockPoolQuery.mock.calls[0]![1]).toContain("rewrite-uuid-0");
    expect(result.accepted).toBe(true);
  });

  it("updates accepted to false", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{
        id: "rewrite-uuid-1",
        accepted: false,
      }],
    });

    const result = await updateRewriteAcceptance("rewrite-uuid-1", false);
    expect(result.accepted).toBe(false);
  });

  it("uses parameterized query", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: "x", accepted: true }],
    });

    await updateRewriteAcceptance("rewrite-uuid-0", true);

    const params = mockPoolQuery.mock.calls[0]![1] as unknown[];
    expect(params).toBeDefined();
    expect(params.length).toBeGreaterThan(0);
  });
});

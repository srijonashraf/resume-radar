import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middleware/auth";

// ── Hoisted mocks ──

const {
  mockGetHistoryList,
  mockGetHistoryDetail,
  mockDeleteHistoryEntry,
} = vi.hoisted(() => ({
  mockGetHistoryList: vi.fn(),
  mockGetHistoryDetail: vi.fn(),
  mockDeleteHistoryEntry: vi.fn(),
}));

vi.mock("../../db/history", () => ({
  getHistoryList: mockGetHistoryList,
  getHistoryDetail: mockGetHistoryDetail,
  deleteHistoryEntry: mockDeleteHistoryEntry,
}));

vi.mock("../../db/sections", () => ({
  loadAnalysisDocument: vi.fn(async () => ({ document: { contact: {}, sections: [] }, userId: "user-123" })),
  loadAnalysisResults: vi.fn(async () => ({ sectionScores: [], atsReport: null })),
}));

vi.mock("../../db/rewrites", () => ({
  loadRewrites: vi.fn(async () => []),
  updateRewriteAcceptance: vi.fn(),
}));

vi.mock("../../config/database", () => ({
  default: { query: vi.fn() },
}));

vi.mock("../../services/aiService", () => ({
  MODEL: "test-model",
}));

vi.mock("../../services/guestService", () => ({
  checkGuestUsage: vi.fn(),
}));

vi.mock("../../services/userService", () => ({
  upsertUserFromGoogleProfile: vi.fn(),
  incrementAnalysisCount: vi.fn(),
}));

vi.mock("../../services/authService", () => ({
  verifyGoogleIdToken: vi.fn(),
  signAppToken: vi.fn(),
}));

vi.mock("../../services/pipelineService", () => ({
  runExtractionPipeline: vi.fn(),
  runAnalysisPipeline: vi.fn(),
  runTailorPipeline: vi.fn(),
}));

vi.mock("../../middleware/upload", () => ({
  upload: {
    single: () => (req: Request, _res: Response, next: NextFunction) => next(),
  },
}));

import router from "../../routes/api";
import { requireAuth } from "../../middleware/auth";

// ── Helpers ──

function createMockRes() {
  const res = {
    statusCode: 200,
    json: vi.fn((data: unknown) => res),
    status: vi.fn((code: number) => { res.statusCode = code; return res; }),
    setHeader: vi.fn(() => res),
    write: vi.fn(),
    end: vi.fn(),
  };
  return res as unknown as Response;
}

function createAuthReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    params: {},
    query: {},
    body: {},
    headers: { authorization: "Bearer test-token" },
    user: {
      id: "user-123",
      google_sub: "google-sub-123",
      email: "test@example.com",
      name: "Test User",
      picture: null,
      analysis_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
    ...overrides,
  } as unknown as AuthRequest;
}

function getRouteHandler(method: string, path: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layer = router.stack.find((l: any) =>
    l.route?.methods?.[method.toLowerCase()] && l.route.path === path,
  );
  if (!layer?.route) throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

/**
 * Call a route handler and wait for its inner async body to complete.
 * asyncHandler wraps handlers with fire-and-forget semantics, so awaiting
 * the outer call returns before the inner async body finishes. This helper
 * flushes the microtask queue after the call.
 */
async function callRoute(
  method: string,
  path: string,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  getRouteHandler(method, path)(req, res, next);
  await new Promise((r) => setTimeout(r, 0));
}

// ── Tests ──

describe("History endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /history", () => {
    it("returns paginated history list", async () => {
      const req = createAuthReq();
      const res = createMockRes();

      mockGetHistoryList.mockResolvedValueOnce({
        items: [{ id: "a1", originalFileName: "r.pdf", sourceType: "pdf", sectionCount: 5, hasTailoring: false, createdAt: "2025-01-01T00:00:00Z" }],
        total: 1,
        page: 1,
        limit: 10,
      });

      await callRoute("get", "/history", req, res, vi.fn());

      expect(mockGetHistoryList).toHaveBeenCalledWith("user-123", 1, 10);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ id: "a1" })]),
          metadata: expect.objectContaining({ pagination: expect.objectContaining({ total: 1 }) }),
        }),
      );
    });

    it("respects page and limit query params", async () => {
      const req = createAuthReq({ query: { page: "2", limit: "5" } });
      const res = createMockRes();

      mockGetHistoryList.mockResolvedValueOnce({ items: [], total: 0, page: 2, limit: 5 });

      await callRoute("get", "/history", req, res, vi.fn());

      expect(mockGetHistoryList).toHaveBeenCalledWith("user-123", 2, 5);
    });
  });

  describe("GET /history/:analysisId", () => {
    it("returns full detail for owned analysis", async () => {
      const req = createAuthReq({ params: { analysisId: "analysis-1" } });
      const res = createMockRes();

      mockGetHistoryDetail.mockResolvedValueOnce({
        id: "analysis-1",
        originalFileName: "resume.pdf",
        sourceType: "pdf",
        createdAt: "2025-01-01T00:00:00Z",
      });

      await callRoute("get", "/history/:analysisId", req, res, vi.fn());

      expect(mockGetHistoryDetail).toHaveBeenCalledWith("analysis-1", "user-123");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: "analysis-1", rewrites: [] }),
        }),
      );
    });

    it("calls next with 404 when analysis not found", async () => {
      const req = createAuthReq({ params: { analysisId: "nonexistent" } });
      const res = createMockRes();
      const next = vi.fn();

      mockGetHistoryDetail.mockResolvedValueOnce(null);

      await callRoute("get", "/history/:analysisId", req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
      }));
    });
  });

  describe("DELETE /history/:analysisId", () => {
    it("deletes owned analysis", async () => {
      const req = createAuthReq({ params: { analysisId: "analysis-1" } });
      const res = createMockRes();

      mockDeleteHistoryEntry.mockResolvedValueOnce(true);

      await callRoute("delete", "/history/:analysisId", req, res, vi.fn());

      expect(mockDeleteHistoryEntry).toHaveBeenCalledWith("analysis-1", "user-123");
      expect(res.json).toHaveBeenCalledWith({ data: { deleted: true } });
    });

    it("calls next with 404 when not found", async () => {
      const req = createAuthReq({ params: { analysisId: "nonexistent" } });
      const res = createMockRes();
      const next = vi.fn();

      mockDeleteHistoryEntry.mockResolvedValueOnce(false);

      await callRoute("delete", "/history/:analysisId", req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
      }));
    });
  });

  describe("Auth required", () => {
    it("returns 401 when no authorization header", async () => {
      const req = { params: {}, query: {}, body: {}, headers: {} } as unknown as AuthRequest;
      const res = createMockRes();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

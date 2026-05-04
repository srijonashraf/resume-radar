import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middleware/auth";

// ── Hoisted mocks ──────────────────────────────────────────────────

const { mockPoolQuery, mockUpdateRewriteAcceptance } = vi.hoisted(() => ({
  mockPoolQuery: vi.fn(),
  mockUpdateRewriteAcceptance: vi.fn(),
}));

vi.mock("../../config/database", () => ({
  default: { query: mockPoolQuery },
}));

vi.mock("../../db/rewrites", () => ({
  updateRewriteAcceptance: mockUpdateRewriteAcceptance,
  loadRewrites: vi.fn(),
  saveRewrites: vi.fn(),
}));

vi.mock("../../db/sections", () => ({
  loadAnalysisDocument: vi.fn(),
  loadAnalysisResults: vi.fn(),
}));

vi.mock("../../db/history", () => ({
  getHistoryList: vi.fn(),
  getHistoryDetail: vi.fn(),
  deleteHistoryEntry: vi.fn(),
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
    single: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  },
}));

import router from "../../routes/api";

// ── Helpers ──────────────────────────────────────────────────────────

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

const REWRITE_ID = "rewrite-uuid-001";
const USER_ID = "user-123";
const OTHER_USER_ID = "user-999";

// ── Tests ────────────────────────────────────────────────────────────

describe("PATCH /tailor/rewrite/:rewriteId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a rewrite with accepted=true", async () => {
    const req = createAuthReq({
      params: { rewriteId: REWRITE_ID },
      body: { accepted: true },
    });
    const res = createMockRes();

    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ user_id: USER_ID }],
    });

    mockUpdateRewriteAcceptance.mockResolvedValueOnce({
      id: REWRITE_ID,
      accepted: true,
    });

    await callRoute("patch", "/tailor/rewrite/:rewriteId", req as unknown as Request, res, vi.fn());

    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining("resume_tailor_rewrites"),
      [REWRITE_ID],
    );
    expect(mockUpdateRewriteAcceptance).toHaveBeenCalledWith(REWRITE_ID, true);
    expect(res.json).toHaveBeenCalledWith({
      data: { id: REWRITE_ID, accepted: true },
    });
  });

  it("rejects a rewrite with accepted=false", async () => {
    const req = createAuthReq({
      params: { rewriteId: REWRITE_ID },
      body: { accepted: false },
    });
    const res = createMockRes();

    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ user_id: USER_ID }],
    });

    mockUpdateRewriteAcceptance.mockResolvedValueOnce({
      id: REWRITE_ID,
      accepted: false,
    });

    await callRoute("patch", "/tailor/rewrite/:rewriteId", req as unknown as Request, res, vi.fn());

    expect(mockUpdateRewriteAcceptance).toHaveBeenCalledWith(REWRITE_ID, false);
    expect(res.json).toHaveBeenCalledWith({
      data: { id: REWRITE_ID, accepted: false },
    });
  });

  it("returns 403 when user does not own the rewrite", async () => {
    const req = createAuthReq({
      params: { rewriteId: REWRITE_ID },
      body: { accepted: true },
    });
    const res = createMockRes();

    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ user_id: OTHER_USER_ID }],
    });

    await callRoute("patch", "/tailor/rewrite/:rewriteId", req as unknown as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "You do not own this rewrite" });
    expect(mockUpdateRewriteAcceptance).not.toHaveBeenCalled();
  });

  it("returns 404 when rewrite does not exist", async () => {
    const req = createAuthReq({
      params: { rewriteId: "nonexistent-rewrite" },
      body: { accepted: true },
    });
    const res = createMockRes();

    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    await callRoute("patch", "/tailor/rewrite/:rewriteId", req as unknown as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Rewrite not found" });
    expect(mockUpdateRewriteAcceptance).not.toHaveBeenCalled();
  });

  it("returns 400 when accepted is missing from body", async () => {
    const req = createAuthReq({
      params: { rewriteId: REWRITE_ID },
      body: {},
    });
    const res = createMockRes();

    await callRoute("patch", "/tailor/rewrite/:rewriteId", req as unknown as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "accepted (boolean) is required" });
    expect(mockPoolQuery).not.toHaveBeenCalled();
    expect(mockUpdateRewriteAcceptance).not.toHaveBeenCalled();
  });

  it("returns 400 when accepted is not a boolean", async () => {
    const req = createAuthReq({
      params: { rewriteId: REWRITE_ID },
      body: { accepted: "yes" },
    });
    const res = createMockRes();

    await callRoute("patch", "/tailor/rewrite/:rewriteId", req as unknown as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "accepted (boolean) is required" });
  });
});

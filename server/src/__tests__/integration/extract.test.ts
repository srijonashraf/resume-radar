import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middleware/auth";

// ── Hoisted mocks ──────────────────────────────────────────────────

const { mockRunExtractionPipeline } = vi.hoisted(() => ({
  mockRunExtractionPipeline: vi.fn(),
}));

vi.mock("../../services/pipelineService", () => ({
  runExtractionPipeline: mockRunExtractionPipeline,
  runAnalysisPipeline: vi.fn(),
  runTailorPipeline: vi.fn(),
}));

vi.mock("../../config/database", () => ({
  default: { query: vi.fn() },
}));

vi.mock("../../services/aiService", () => ({
  MODEL: "test-model",
}));

vi.mock("../../services/guestService", () => ({
  checkGuestUsage: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("../../services/userService", () => ({
  upsertUserFromGoogleProfile: vi.fn(),
  incrementAnalysisCount: vi.fn(),
}));

vi.mock("../../services/authService", () => ({
  verifyGoogleIdToken: vi.fn(),
  signAppToken: vi.fn(),
  verifyAppToken: vi.fn().mockReturnValue({ sub: "user-123" }),
}));

vi.mock("../../db/history", () => ({
  getHistoryList: vi.fn(),
  getHistoryDetail: vi.fn(),
  deleteHistoryEntry: vi.fn(),
}));

vi.mock("../../db/sections", () => ({
  loadAnalysisDocument: vi.fn(),
  loadAnalysisResults: vi.fn(),
}));

vi.mock("../../db/rewrites", () => ({
  loadRewrites: vi.fn(),
  updateRewriteAcceptance: vi.fn(),
  saveRewrites: vi.fn(),
}));

import router from "../../routes/api";

// ── Helpers ──────────────────────────────────────────────────────────

function createMockRes() {
  const res = {
    statusCode: 200,
    json: vi.fn((data: unknown) => {
      return res;
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    setHeader: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  };

  return res as unknown as Response;
}

function createGuestReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    file: undefined,
    ...overrides,
  } as unknown as AuthRequest;
}

function findRouteHandler(method: string, path: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layer = router.stack.find((l: any) =>
    l.route && l.route.methods[method.toLowerCase()] && l.route.path === path,
  );
  if (!layer || !layer.route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }
  const handlers = layer.route.stack as Array<{ handle: (req: Request, res: Response, next: NextFunction) => void }>;
  return handlers.map((h) => h.handle);
}

/**
 * Parse SSE writes from the mock res.write calls.
 * Returns array of { event, data } objects.
 */
function parseSSEWrites(res: Response): Array<{ event: string; data: unknown }> {
  const writeCalls = (res.write as ReturnType<typeof vi.fn>).mock.calls;
  return writeCalls.map((call) => {
    const raw = call[0] as string;
    const eventMatch = raw.match(/event: (.+)\ndata: (.+)\n\n/s);
    if (!eventMatch) return null;
    return {
      event: eventMatch[1],
      data: JSON.parse(eventMatch[2]),
    };
  }).filter((e): e is { event: string; data: unknown } => e !== null);
}

// ── Tests ────────────────────────────────────────────────────────────

describe("POST /extract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends error SSE when no resumeText and no file provided", async () => {
    const req = createGuestReq({ body: {} });
    const res = createMockRes();

    const handlers = findRouteHandler("post", "/extract");
    // The route handler is the last in the chain (after rate limiter, optionalAuth, conditionalUpload)
    const routeHandler = handlers[handlers.length - 1];
    await routeHandler(req as unknown as Request, res, vi.fn());

    const sseEvents = parseSSEWrites(res);
    const errorEvent = sseEvents.find((e) => e.event === "error");

    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data).toEqual({
      error: "resumeText is required",
    });
    expect(res.end).toHaveBeenCalled();
    expect(mockRunExtractionPipeline).not.toHaveBeenCalled();
  });

  it("sends error SSE when text exceeds 50,000 characters", async () => {
    const longText = "a".repeat(50001);
    const req = createGuestReq({ body: { resumeText: longText } });
    const res = createMockRes();

    const handlers = findRouteHandler("post", "/extract");
    const routeHandler = handlers[handlers.length - 1];
    await routeHandler(req as unknown as Request, res, vi.fn());

    const sseEvents = parseSSEWrites(res);
    const errorEvent = sseEvents.find((e) => e.event === "error");

    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data).toEqual({
      error: "Resume text exceeds maximum length (50,000 characters).",
    });
    expect(res.end).toHaveBeenCalled();
    expect(mockRunExtractionPipeline).not.toHaveBeenCalled();
  });

  it("sends error SSE when resumeText is not a string", async () => {
    const req = createGuestReq({ body: { resumeText: 123 } });
    const res = createMockRes();

    const handlers = findRouteHandler("post", "/extract");
    const routeHandler = handlers[handlers.length - 1];
    await routeHandler(req as unknown as Request, res, vi.fn());

    const sseEvents = parseSSEWrites(res);
    const errorEvent = sseEvents.find((e) => e.event === "error");

    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data).toEqual({
      error: "resumeText is required",
    });
  });

  it("sends error SSE when resumeText is empty string", async () => {
    const req = createGuestReq({ body: { resumeText: "" } });
    const res = createMockRes();

    const handlers = findRouteHandler("post", "/extract");
    const routeHandler = handlers[handlers.length - 1];
    await routeHandler(req as unknown as Request, res, vi.fn());

    const sseEvents = parseSSEWrites(res);
    const errorEvent = sseEvents.find((e) => e.event === "error");

    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data).toEqual({
      error: "resumeText is required",
    });
  });

  it("invokes pipeline with valid text input", async () => {
    const req = createGuestReq({ body: { resumeText: "John Doe - Software Engineer" } });
    const res = createMockRes();

    mockRunExtractionPipeline.mockResolvedValueOnce({
      document: { sections: [] },
      profession: { professionId: "software_engineer", confidence: 0.9 },
      careerLevel: { levelId: "mid", label: "Mid", totalMonths: 36 },
      sectionCoverage: { required: [], recommended: [], optional: [] },
    });

    const handlers = findRouteHandler("post", "/extract");
    const routeHandler = handlers[handlers.length - 1];
    await routeHandler(req as unknown as Request, res, vi.fn());

    expect(mockRunExtractionPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "John Doe - Software Engineer",
      }),
      expect.any(Function),
    );

    const sseEvents = parseSSEWrites(res);
    const completeEvent = sseEvents.find((e) => e.event === "complete");
    expect(completeEvent).toBeDefined();
    expect(res.end).toHaveBeenCalled();
  });

  it("sets SSE headers on the response", async () => {
    const req = createGuestReq({ body: { resumeText: "resume text" } });
    const res = createMockRes();

    mockRunExtractionPipeline.mockResolvedValueOnce({
      document: { sections: [] },
      profession: { professionId: "generic", confidence: 0.5 },
      careerLevel: { levelId: "all_levels", label: "All", totalMonths: 0 },
      sectionCoverage: { required: [], recommended: [], optional: [] },
    });

    const handlers = findRouteHandler("post", "/extract");
    const routeHandler = handlers[handlers.length - 1];
    await routeHandler(req as unknown as Request, res, vi.fn());

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
    expect(res.setHeader).toHaveBeenCalledWith("Connection", "keep-alive");
  });

  it("sends error SSE on pipeline failure", async () => {
    const req = createGuestReq({ body: { resumeText: "some text" } });
    const res = createMockRes();

    mockRunExtractionPipeline.mockRejectedValueOnce(new Error("AI service unavailable"));

    const handlers = findRouteHandler("post", "/extract");
    const routeHandler = handlers[handlers.length - 1];
    await routeHandler(req as unknown as Request, res, vi.fn());

    const sseEvents = parseSSEWrites(res);
    const errorEvent = sseEvents.find((e) => e.event === "error");

    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data).toEqual({
      error: "Extraction failed. Please try again.",
    });
  });

  it("handles validation error with outcome property gracefully", async () => {
    const req = createGuestReq({ body: { resumeText: "not a resume" } });
    const res = createMockRes();

    const validationError = Object.assign(
      new Error("No contact information found."),
      { outcome: "NOT_A_RESUME" },
    );
    mockRunExtractionPipeline.mockRejectedValueOnce(validationError);

    const handlers = findRouteHandler("post", "/extract");
    const routeHandler = handlers[handlers.length - 1];
    await routeHandler(req as unknown as Request, res, vi.fn());

    // Should end without sending a generic error SSE — the pipeline already sent the error
    expect(res.end).toHaveBeenCalled();
  });
});

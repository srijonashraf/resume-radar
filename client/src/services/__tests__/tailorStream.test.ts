import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { tailorResumeStream } from "../../services/api";
import type { Rewrite } from "@resumetra/shared";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

function encodeSSE(events: Array<{ event: string; data: unknown }>): string {
  return events
    .map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`)
    .join("");
}

function createMockResponse(events: Array<{ event: string; data: unknown }>) {
  const body = encodeSSE(events);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(body));
      controller.close();
    },
  });

  return {
    ok: true,
    status: 200,
    body: stream,
    json: vi.fn(),
  } as unknown as Response;
}

const MOCK_REWRITE: Rewrite = {
  id: "rewrite-0",
  sectionId: "section-0",
  itemId: "item-0-1",
  field: "bullet",
  before: "Helped with project",
  after: "Led project delivery",
  rationale: "Stronger action verb",
  keywordsAdded: ["leadership"],
  gapClassification: "REWRITTEN",
  accepted: null,
};

const TAILOR_COMPLETE_PAYLOAD = {
  rewrites: [MOCK_REWRITE],
  stats: { rewritten: 1, reframed: 0, missing: 0, total: 1 },
};

describe("tailorResumeStream", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends POST to /tailor with analysisId and jobDescription", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "tailoring_start", data: { message: "Starting..." } },
        { event: "tailoring_complete", data: TAILOR_COMPLETE_PAYLOAD },
      ]),
    );

    await tailorResumeStream("analysis-123", "Python developer job", {
      onTailoringStart: vi.fn(),
      onTailoringSection: vi.fn(),
      onTailoringRewrite: vi.fn(),
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/tailor"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );

    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(call![1]!.body as string);
    expect(body.analysisId).toBe("analysis-123");
    expect(body.jobDescription).toBe("Python developer job");
  });

  it("calls onTailoringStart callback", async () => {
    const onTailoringStart = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "tailoring_start", data: { message: "Classifying skills..." } },
        { event: "tailoring_complete", data: TAILOR_COMPLETE_PAYLOAD },
      ]),
    );

    await tailorResumeStream("analysis-123", "job desc", {
      onTailoringStart,
      onTailoringSection: vi.fn(),
      onTailoringRewrite: vi.fn(),
    });

    expect(onTailoringStart).toHaveBeenCalledWith({ message: "Classifying skills..." });
  });

  it("calls onTailoringSection callback per section", async () => {
    const onTailoringSection = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "tailoring_start", data: { message: "Starting..." } },
        { event: "tailoring_section", data: { sectionId: "section-0", sectionTitle: "Experience" } },
        { event: "tailoring_section", data: { sectionId: "section-1", sectionTitle: "Skills" } },
        { event: "tailoring_complete", data: TAILOR_COMPLETE_PAYLOAD },
      ]),
    );

    await tailorResumeStream("analysis-123", "job desc", {
      onTailoringStart: vi.fn(),
      onTailoringSection,
      onTailoringRewrite: vi.fn(),
    });

    expect(onTailoringSection).toHaveBeenCalledTimes(2);
    expect(onTailoringSection).toHaveBeenCalledWith({ sectionId: "section-0", sectionTitle: "Experience" });
    expect(onTailoringSection).toHaveBeenCalledWith({ sectionId: "section-1", sectionTitle: "Skills" });
  });

  it("calls onTailoringRewrite callback per rewrite", async () => {
    const onTailoringRewrite = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "tailoring_start", data: { message: "Starting..." } },
        { event: "tailoring_section", data: { sectionId: "section-0", sectionTitle: "Experience" } },
        { event: "tailoring_rewrite", data: MOCK_REWRITE },
        { event: "tailoring_complete", data: TAILOR_COMPLETE_PAYLOAD },
      ]),
    );

    await tailorResumeStream("analysis-123", "job desc", {
      onTailoringStart: vi.fn(),
      onTailoringSection: vi.fn(),
      onTailoringRewrite,
    });

    expect(onTailoringRewrite).toHaveBeenCalledTimes(1);
    expect(onTailoringRewrite).toHaveBeenCalledWith(
      expect.objectContaining({ id: "rewrite-0", gapClassification: "REWRITTEN" }),
    );
  });

  it("returns complete payload with rewrites and stats", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "tailoring_start", data: { message: "Starting..." } },
        { event: "tailoring_complete", data: TAILOR_COMPLETE_PAYLOAD },
      ]),
    );

    const result = await tailorResumeStream("analysis-123", "job desc", {
      onTailoringStart: vi.fn(),
      onTailoringSection: vi.fn(),
      onTailoringRewrite: vi.fn(),
    });

    expect(result.rewrites).toHaveLength(1);
    expect(result.stats.total).toBe(1);
    expect(result.stats.rewritten).toBe(1);
  });

  it("throws on SSE error event", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "error", data: { error: "Tailoring failed: no JD provided" } },
      ]),
    );

    await expect(
      tailorResumeStream("analysis-123", "job desc", {
        onTailoringStart: vi.fn(),
        onTailoringSection: vi.fn(),
        onTailoringRewrite: vi.fn(),
      }),
    ).rejects.toThrow("Tailoring failed: no JD provided");
  });

  it("throws when stream ends without complete event", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "tailoring_start", data: { message: "Starting..." } },
      ]),
    );

    await expect(
      tailorResumeStream("analysis-123", "job desc", {
        onTailoringStart: vi.fn(),
        onTailoringSection: vi.fn(),
        onTailoringRewrite: vi.fn(),
      }),
    ).rejects.toThrow("Stream ended without complete event");
  });

  it("sends auth token when available", async () => {
    localStorageMock.setItem("resumetra_token", "test-jwt-token");
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "tailoring_complete", data: TAILOR_COMPLETE_PAYLOAD },
      ]),
    );

    await tailorResumeStream("analysis-123", "job desc", {
      onTailoringStart: vi.fn(),
      onTailoringSection: vi.fn(),
      onTailoringRewrite: vi.fn(),
    });

    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = call![1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-jwt-token");
  });
});

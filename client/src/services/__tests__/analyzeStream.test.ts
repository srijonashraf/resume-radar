import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyzeResumeStream } from "../../services/api";
import type {
  SSEComputingMetrics,
  SSEMetricsCompletePayload,
  SSEAnalyzingProgress,
} from "../../types";

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

describe("analyzeResumeStream", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const COMPLETE_RESULT = {
    deterministicMetrics: {
      wordCount: 100,
      bulletCount: 5,
      avgBulletWordCount: 10,
      sectionsPresent: ["experience"],
      sectionsMissing: [],
      bulletsWithActionVerb: 3,
      bulletsWithMetric: 1,
      formattingIssues: [],
      careerLevelDetected: "mid",
      totalExperienceMonths: 24,
    },
    sectionMetrics: [],
    sectionScores: [
      { sectionId: "section-0", contentScore: 7, impactScore: 6, issues: [] },
    ],
    readability: { score: 7, issues: [] },
    atsReport: null,
    keywordFrequency: {},
  };

  it("sends POST to /analyze with analysisId and jobDescription", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "computing_metrics", data: { message: "Computing..." } },
        { event: "complete", data: COMPLETE_RESULT },
      ]),
    );

    await analyzeResumeStream("analysis-123", "Python developer", {
      onComputingMetrics: vi.fn(),
      onMetricsComplete: vi.fn(),
      onAnalyzing: vi.fn(),
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/analyze"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );

    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(call![1]!.body as string);
    expect(body.analysisId).toBe("analysis-123");
    expect(body.jobDescription).toBe("Python developer");
  });

  it("omits jobDescription when null", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "computing_metrics", data: { message: "Computing..." } },
        { event: "complete", data: COMPLETE_RESULT },
      ]),
    );

    await analyzeResumeStream("analysis-123", null, {
      onComputingMetrics: vi.fn(),
      onMetricsComplete: vi.fn(),
      onAnalyzing: vi.fn(),
    });

    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(call![1]!.body as string);
    expect(body).not.toHaveProperty("jobDescription");
    expect(body.analysisId).toBe("analysis-123");
  });

  it("calls onComputingMetrics callback", async () => {
    const onComputingMetrics = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "computing_metrics", data: { message: "Computing metrics..." } },
        { event: "complete", data: COMPLETE_RESULT },
      ]),
    );

    await analyzeResumeStream("analysis-123", null, {
      onComputingMetrics,
      onMetricsComplete: vi.fn(),
      onAnalyzing: vi.fn(),
    });

    expect(onComputingMetrics).toHaveBeenCalledWith({ message: "Computing metrics..." });
  });

  it("calls onMetricsComplete callback", async () => {
    const onMetricsComplete = vi.fn();
    const metricsPayload: SSEMetricsCompletePayload = {
      metrics: {
        wordCount: 100,
        bulletCount: 5,
        avgBulletWordCount: 10,
        sectionsPresent: [],
        sectionsMissing: [],
        bulletsWithActionVerb: 0,
        bulletsWithMetric: 0,
        formattingIssues: [],
        careerLevelDetected: "mid",
        totalExperienceMonths: 0,
        perSection: [],
        keywordFrequency: {},
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "metrics_complete", data: metricsPayload },
        { event: "complete", data: COMPLETE_RESULT },
      ]),
    );

    await analyzeResumeStream("analysis-123", null, {
      onComputingMetrics: vi.fn(),
      onMetricsComplete,
      onAnalyzing: vi.fn(),
    });

    expect(onMetricsComplete).toHaveBeenCalledWith(
      expect.objectContaining({ metrics: expect.any(Object) }),
    );
  });

  it("calls onAnalyzing callback per section", async () => {
    const onAnalyzing = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "computing_metrics", data: { message: "Computing..." } },
        { event: "analyzing", data: { sectionId: "section-0", sectionTitle: "Experience" } },
        { event: "analyzing", data: { sectionId: "section-1", sectionTitle: "Skills" } },
        { event: "complete", data: COMPLETE_RESULT },
      ]),
    );

    await analyzeResumeStream("analysis-123", null, {
      onComputingMetrics: vi.fn(),
      onMetricsComplete: vi.fn(),
      onAnalyzing,
    });

    expect(onAnalyzing).toHaveBeenCalledTimes(2);
    expect(onAnalyzing).toHaveBeenCalledWith({ sectionId: "section-0", sectionTitle: "Experience" });
    expect(onAnalyzing).toHaveBeenCalledWith({ sectionId: "section-1", sectionTitle: "Skills" });
  });

  it("returns the complete result", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "computing_metrics", data: { message: "Computing..." } },
        { event: "complete", data: COMPLETE_RESULT },
      ]),
    );

    const result = await analyzeResumeStream("analysis-123", null, {
      onComputingMetrics: vi.fn(),
      onMetricsComplete: vi.fn(),
      onAnalyzing: vi.fn(),
    });

    expect(result.deterministicMetrics.wordCount).toBe(100);
    expect(result.sectionScores).toHaveLength(1);
    expect(result.readability.score).toBe(7);
  });

  it("throws on SSE error event", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "error", data: { error: "Analysis failed: invalid input" } },
      ]),
    );

    await expect(
      analyzeResumeStream("analysis-123", null, {
        onComputingMetrics: vi.fn(),
        onMetricsComplete: vi.fn(),
        onAnalyzing: vi.fn(),
      }),
    ).rejects.toThrow("Analysis failed: invalid input");
  });

  it("throws when stream ends without complete event", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "computing_metrics", data: { message: "Computing..." } },
      ]),
    );

    await expect(
      analyzeResumeStream("analysis-123", null, {
        onComputingMetrics: vi.fn(),
        onMetricsComplete: vi.fn(),
        onAnalyzing: vi.fn(),
      }),
    ).rejects.toThrow("Stream ended without complete event");
  });

  it("sends auth token when available", async () => {
    localStorageMock.setItem("resumetra_token", "test-jwt-token");
    globalThis.fetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { event: "complete", data: COMPLETE_RESULT },
      ]),
    );

    await analyzeResumeStream("analysis-123", null, {
      onComputingMetrics: vi.fn(),
      onMetricsComplete: vi.fn(),
      onAnalyzing: vi.fn(),
    });

    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = call![1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-jwt-token");
  });
});

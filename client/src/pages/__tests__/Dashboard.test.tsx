import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Dashboard from "../Dashboard";
import { useStore } from "../../store/useStore";
import { useResumeEditorStore } from "../../store/useResumeEditorStore";
import type { ExtractionResult, AnalysisResultV2, Rewrite } from "@resumetra/shared";
import type { ResumeDocument } from "@resumetra/shared";

// ── Mock child components ────────────────────────────────────────────

vi.mock("../../components/app/AppShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

vi.mock("../../components/upload/PdfUploader", () => ({
  default: () => <div data-testid="pdf-uploader" />,
}));

vi.mock("../../components/upload/SectionConfirmation", () => ({
  default: () => <div data-testid="section-confirmation" />,
}));

vi.mock("../../components/upload/ResumeHealthCheck", () => ({
  default: ({ onAnalyze }: { onAnalyze: () => void }) => (
    <div data-testid="resume-health-check">
      <button onClick={onAnalyze} data-testid="analyze-btn">Analyze</button>
    </div>
  ),
}));

vi.mock("../../components/analytics/AnalysisResults", () => ({
  default: () => <div data-testid="analysis-results" />,
}));

vi.mock("../../components/tailor/TailorResults", () => ({
  default: () => <div data-testid="tailor-results" />,
}));

vi.mock("../../components/dashboard/DashboardTabs", () => ({
  default: () => <div data-testid="dashboard-tabs" />,
}));

vi.mock("../../components/editor/ResumeEditorPanel", () => ({
  default: () => <div data-testid="editor-panel" />,
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

vi.mock("../../services/api", () => ({
  extractResumeStream: vi.fn(),
  analyzeResumeStream: vi.fn(),
  tailorResumeStream: vi.fn(),
  fetchUsage: vi.fn().mockResolvedValue(null),
  patchRewriteAcceptance: vi.fn(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────

const MOCK_DOC: ResumeDocument = {
  contact: {
    fullName: "Jane Doe",
    email: "jane@test.com",
    phone: "555",
    location: "NYC",
    linkedin: null,
    github: null,
    portfolio: null,
  },
  sections: [
    {
      id: "sec-exp",
      type: "experience",
      title: "Experience",
      displayOrder: 0,
      items: [{ id: "item-1", heading: "Acme", bullets: ["Built things"] }],
    },
  ],
  detectedProfession: "Engineer",
  detectedCareerLevel: "Senior",
};

const MOCK_EXTRACTION: ExtractionResult = {
  document: MOCK_DOC,
  profession: { professionId: "eng", confidence: 0.9 },
  careerLevel: { levelId: "senior", label: "Senior", totalMonths: 60 },
  sectionCoverage: {
    required: [],
    recommended: [],
    optional: [],
  },
  analysisId: "analysis-123",
};

const MOCK_ANALYSIS = {
  scores: { atsCompatibility: 8, impact: 7, content: 8, readability: 9 },
  feedback: [],
} as unknown as AnalysisResultV2;

const MOCK_REWRITES: Rewrite[] = [
  {
    id: "rw-1",
    sectionId: "sec-exp",
    itemId: "item-1",
    field: "bullets.0",
    before: "Built things",
    after: "Architected solutions",
    rationale: "Stronger",
    keywordsAdded: ["architecture"],
    gapClassification: "REWRITTEN",
    accepted: null,
  },
];

// ── Helper ───────────────────────────────────────────────────────────

function setStateToTailorComplete() {
  const store = useStore.getState();
  store.setExtractionResult(MOCK_EXTRACTION);
  store.setExtractionPhase("complete");
  store.setExtractionConfirmed(true);
  store.setAnalysisResult(MOCK_ANALYSIS);
  store.setAnalysisPhase("complete");
  store.setTailorRewrites(MOCK_REWRITES);
  store.setTailorStats({ rewritten: 1, reframed: 0, missing: 0, total: 1 });
  store.setTailorPhase("complete");
}

// ── Tests ────────────────────────────────────────────────────────────

describe("Dashboard editor integration", () => {
  beforeEach(() => {
    useStore.getState().clearCurrentAnalysis();
    useResumeEditorStore.getState().resetEditor();
  });

  it("shows Open Editor button after tailoring completes", () => {
    useStore.setState({
      resumeData: { file: null, rawText: "test" },
      jobDescription: "JD text",
    });
    setStateToTailorComplete();

    render(<Dashboard />);

    expect(screen.getByTestId("tailor-results")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open editor/i }),
    ).toBeInTheDocument();
  });

  it("shows ResumeEditorPanel when Open Editor is clicked", () => {
    useStore.setState({
      resumeData: { file: null, rawText: "test" },
      jobDescription: "JD text",
    });
    setStateToTailorComplete();

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /open editor/i }));

    expect(screen.getByTestId("editor-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("tailor-results")).not.toBeInTheDocument();
  });

  it("initializes editor store when Open Editor is clicked", () => {
    useStore.setState({
      resumeData: { file: null, rawText: "test" },
      jobDescription: "JD text",
    });
    setStateToTailorComplete();

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /open editor/i }));

    const editorState = useResumeEditorStore.getState();
    expect(editorState.sourceDocument).not.toBeNull();
    expect(editorState.rewrites).toEqual(MOCK_REWRITES);
  });

  it("resets editor store when Analyze Another Resume is clicked", () => {
    useStore.setState({
      resumeData: { file: null, rawText: "test" },
      jobDescription: "JD text",
    });
    setStateToTailorComplete();

    render(<Dashboard />);

    // Open editor first
    fireEvent.click(screen.getByRole("button", { name: /open editor/i }));
    expect(useResumeEditorStore.getState().sourceDocument).not.toBeNull();

    // Click "Analyze Another Resume" (from editor view)
    fireEvent.click(
      screen.getByRole("button", { name: /analyze another resume/i }),
    );

    expect(useResumeEditorStore.getState().sourceDocument).toBeNull();
    expect(useStore.getState().analysisPhase).toBe("idle");
  });

  it("does not show Open Editor before tailoring completes", () => {
    useStore.setState({
      resumeData: { file: null, rawText: "test" },
      jobDescription: "JD text",
    });
    // Only analysis complete, no tailoring
    const store = useStore.getState();
    store.setExtractionResult(MOCK_EXTRACTION);
    store.setExtractionPhase("complete");
    store.setExtractionConfirmed(true);
    store.setAnalysisResult(MOCK_ANALYSIS);
    store.setAnalysisPhase("complete");

    render(<Dashboard />);

    expect(
      screen.queryByRole("button", { name: /open editor/i }),
    ).not.toBeInTheDocument();
  });
});

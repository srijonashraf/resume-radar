import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useResumeEditorStore } from "../../../store/useResumeEditorStore";
import EditorToolbar from "../EditorToolbar";
import type { ResumeDocument, Rewrite } from "@resumetra/shared";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("../../../components/pdf/ResumePdfDocument", () => ({
  generatePdf: vi.fn().mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" })),
  downloadBlob: vi.fn(),
}));

vi.mock("../../../utils/resolvedDocumentToPdfData", () => ({
  resolvedDocumentToPdfData: vi.fn().mockReturnValue({
    name: "John Doe",
    contact: { email: "john@test.com", phone: "123", location: "NYC" },
    workExperiences: [],
    education: [],
    projects: [],
    certifications: [],
    skills: [],
    sectionOrder: [],
  }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const MOCK_DOCUMENT: ResumeDocument = {
  contact: {
    fullName: "John Doe",
    email: "john@test.com",
    phone: "555-1234",
    location: "New York, NY",
    linkedin: null,
    github: null,
    portfolio: null,
  },
  sections: [
    {
      id: "exp-1",
      type: "experience",
      title: "Experience",
      displayOrder: 0,
      items: [
        {
          id: "item-1",
          heading: "Software Engineer",
          subheading: "Acme Corp",
          dateRange: "2020 - 2023",
          bullets: ["Built things", "Led team"],
        },
      ],
    },
  ],
  detectedProfession: "Software Engineer",
  detectedCareerLevel: "Mid",
};

function makeRewrite(overrides: Partial<Rewrite> & { id: string }): Rewrite {
  return {
    sectionId: "exp-1",
    itemId: "item-1",
    field: "heading",
    before: "Original",
    after: "Rewritten",
    rationale: "Better wording",
    keywordsAdded: ["leadership"],
    gapClassification: "REWRITTEN",
    accepted: null,
    ...overrides,
  };
}

function initStore(rewrites?: Rewrite[]) {
  useResumeEditorStore.getState().initialize(MOCK_DOCUMENT, rewrites);
}

function resetStore() {
  useResumeEditorStore.getState().resetEditor();
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("EditorToolbar", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  // ── Template switcher ──────────────────────────────────────────────────

  describe("template switcher", () => {
    it("renders with the current template selected", () => {
      initStore();
      render(<EditorToolbar />);

      const select = screen.getByLabelText(/template/i);
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue("professional");
    });

    it("dispatches setTemplate when a different template is selected", async () => {
      const user = userEvent.setup();
      initStore();
      render(<EditorToolbar />);

      const select = screen.getByLabelText(/template/i);
      await user.selectOptions(select, "modern");

      expect(useResumeEditorStore.getState().selectedTemplate).toBe("modern");
    });

    it("reflects template changes from the store", () => {
      initStore();
      useResumeEditorStore.getState().setTemplate("modern");
      render(<EditorToolbar />);

      const select = screen.getByLabelText(/template/i);
      expect(select).toHaveValue("modern");
    });
  });

  // ── Download PDF button ───────────────────────────────────────────────

  describe("download PDF button", () => {
    it("renders a download PDF button", () => {
      initStore();
      render(<EditorToolbar />);
      expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument();
    });

    it("calls generatePdf with resolved data when clicked", async () => {
      const user = userEvent.setup();
      initStore();
      render(<EditorToolbar />);

      const { generatePdf, downloadBlob } = await import(
        "../../../components/pdf/ResumePdfDocument"
      );
      const { resolvedDocumentToPdfData } = await import(
        "../../../utils/resolvedDocumentToPdfData"
      );

      await user.click(screen.getByRole("button", { name: /download pdf/i }));

      expect(resolvedDocumentToPdfData).toHaveBeenCalledTimes(1);
      expect(generatePdf).toHaveBeenCalledTimes(1);
      // downloadBlob is called after generatePdf resolves
      await vi.waitFor(() => {
        expect(downloadBlob).toHaveBeenCalledTimes(1);
      });
    });

    it("is disabled when no document is loaded", () => {
      render(<EditorToolbar />);
      expect(screen.getByRole("button", { name: /download pdf/i })).toBeDisabled();
    });
  });

  // ── Rewrite summary ───────────────────────────────────────────────────

  describe("rewrite summary", () => {
    it("shows no rewrite message when there are no rewrites", () => {
      initStore();
      render(<EditorToolbar />);
      expect(screen.getByText(/no rewrites/i)).toBeInTheDocument();
    });

    it("shows correct pending count", () => {
      initStore([
        makeRewrite({ id: "rw-1", accepted: null }),
        makeRewrite({ id: "rw-2", accepted: null }),
        makeRewrite({ id: "rw-3", accepted: true }),
      ]);
      render(<EditorToolbar />);
      expect(screen.getByText("2 pending rewrites")).toBeInTheDocument();
    });

    it("shows correct accepted and rejected counts", () => {
      initStore([
        makeRewrite({ id: "rw-1", accepted: true }),
        makeRewrite({ id: "rw-2", accepted: false }),
        makeRewrite({ id: "rw-3", accepted: false }),
      ]);
      render(<EditorToolbar />);
      expect(screen.getByText(/1 accepted/)).toBeInTheDocument();
      expect(screen.getByText(/2 rejected/)).toBeInTheDocument();
    });
  });

  // ── Classification badges ─────────────────────────────────────────────

  describe("classification badges", () => {
    it("renders badges for each classification type present", () => {
      initStore([
        makeRewrite({ id: "rw-1", gapClassification: "REWRITTEN", accepted: null }),
        makeRewrite({ id: "rw-2", gapClassification: "REFRAMED", accepted: null }),
        makeRewrite({ id: "rw-3", gapClassification: "MISSING", accepted: null }),
      ]);
      render(<EditorToolbar />);
      expect(screen.getByText("REWRITTEN")).toBeInTheDocument();
      expect(screen.getByText("REFRAMED")).toBeInTheDocument();
      expect(screen.getByText("MISSING")).toBeInTheDocument();
    });

    it("shows counts next to classification badges", () => {
      initStore([
        makeRewrite({ id: "rw-1", gapClassification: "REWRITTEN", accepted: null }),
        makeRewrite({ id: "rw-2", gapClassification: "REWRITTEN", accepted: null }),
        makeRewrite({ id: "rw-3", gapClassification: "MISSING", accepted: null }),
      ]);
      render(<EditorToolbar />);
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  // ── Accept All / Reject All / Reset ───────────────────────────────────

  describe("bulk rewrite actions", () => {
    it("accepts all rewrites when Accept All is clicked", async () => {
      const user = userEvent.setup();
      initStore([
        makeRewrite({ id: "rw-1", accepted: null }),
        makeRewrite({ id: "rw-2", accepted: null }),
      ]);
      render(<EditorToolbar />);

      await user.click(screen.getByRole("button", { name: /accept all/i }));

      const state = useResumeEditorStore.getState();
      expect(state.rewrites.every((rw) => rw.accepted === true)).toBe(true);
    });

    it("rejects all rewrites when Reject All is clicked", async () => {
      const user = userEvent.setup();
      initStore([
        makeRewrite({ id: "rw-1", accepted: null }),
        makeRewrite({ id: "rw-2", accepted: null }),
      ]);
      render(<EditorToolbar />);

      await user.click(screen.getByRole("button", { name: /reject all/i }));

      const state = useResumeEditorStore.getState();
      expect(state.rewrites.every((rw) => rw.accepted === false)).toBe(true);
    });

    it("resets all rewrites when Reset is clicked", async () => {
      const user = userEvent.setup();
      initStore([
        makeRewrite({ id: "rw-1", accepted: true }),
        makeRewrite({ id: "rw-2", accepted: false }),
      ]);
      render(<EditorToolbar />);

      await user.click(screen.getByRole("button", { name: /reset/i }));

      const state = useResumeEditorStore.getState();
      expect(state.rewrites.every((rw) => rw.accepted === null)).toBe(true);
    });

    it("disables bulk action buttons when there are no rewrites", () => {
      initStore();
      render(<EditorToolbar />);

      expect(screen.getByRole("button", { name: /accept all/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /reject all/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /reset/i })).toBeDisabled();
    });
  });
});

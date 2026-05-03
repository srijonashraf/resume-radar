import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ClassificationBadge from "../ClassificationBadge";
import RewriteDiff from "../RewriteDiff";
import RewriteCard from "../RewriteCard";
import LearningPathCard from "../LearningPathCard";
import RewriteManager from "../RewriteManager";
import TailorResults from "../TailorResults";
import type { Rewrite } from "@resumetra/shared";

// ── Fixtures ─────────────────────────────────────────────────

const REWRITE_REWRITTEN: Rewrite = {
  id: "rw-1",
  sectionId: "section-0",
  itemId: "item-0-0",
  field: "bullet",
  before: "Helped with project delivery",
  after: "Led cross-functional project delivery with 5 engineers",
  rationale: "Stronger action verb + quantified team size",
  keywordsAdded: ["leadership", "project management"],
  gapClassification: "REWRITTEN",
  accepted: null,
};

const REWRITE_REFRAMED: Rewrite = {
  id: "rw-2",
  sectionId: "section-0",
  itemId: "item-0-1",
  field: "bullet",
  before: "Used Docker for deployment",
  after: "Containerized applications using Docker, demonstrating infrastructure-as-code practices applicable to Kubernetes",
  rationale: "Adjacent experience: Docker → containerization concepts transfer to Kubernetes",
  keywordsAdded: ["containerization"],
  gapClassification: "REFRAMED",
  accepted: null,
};

const REWRITE_MISSING: Rewrite = {
  id: "rw-3",
  sectionId: "section-1",
  itemId: "item-1-0",
  field: "bullet",
  before: "No Rust experience",
  after: "Built high-performance CLI tool in Rust handling 100K+ requests/sec",
  rationale: "Missing skill with learning path",
  keywordsAdded: [],
  gapClassification: "MISSING",
  accepted: null,
};

const LEARNING_PATH = {
  courses: ["Rust by Example", "The Rust Programming Language"],
  projects: ["Build a CLI tool", "Write a web server"],
  timeline: "3–6 months",
  targetBullet: "Built high-performance CLI tool in Rust",
};

const MISSING_WITH_PATH: Rewrite = {
  ...REWRITE_MISSING,
  after: LEARNING_PATH.targetBullet,
};

// ── ClassificationBadge ──────────────────────────────────────

describe("ClassificationBadge", () => {
  it("renders REWRITTEN badge", () => {
    render(<ClassificationBadge classification="REWRITTEN" />);
    expect(screen.getByText("REWRITTEN")).toBeDefined();
  });

  it("renders REFRAMED badge", () => {
    render(<ClassificationBadge classification="REFRAMED" />);
    expect(screen.getByText("REFRAMED")).toBeDefined();
  });

  it("renders MISSING badge", () => {
    render(<ClassificationBadge classification="MISSING" />);
    expect(screen.getByText("MISSING")).toBeDefined();
  });
});

// ── RewriteDiff ──────────────────────────────────────────────

describe("RewriteDiff", () => {
  it("renders before and after text", () => {
    render(<RewriteDiff before="old text" after="new text" />);

    expect(screen.getByText(/old text/)).toBeDefined();
    expect(screen.getByText(/new text/)).toBeDefined();
  });

  it("renders labels", () => {
    render(<RewriteDiff before="a" after="b" />);

    expect(screen.getByText("Before")).toBeDefined();
    expect(screen.getByText("After")).toBeDefined();
  });
});

// ── RewriteCard ──────────────────────────────────────────────

describe("RewriteCard", () => {
  const onAccept = vi.fn();
  const onReject = vi.fn();

  it("renders before/after, rationale, and keywords", () => {
    render(
      <RewriteCard
        rewrite={REWRITE_REWRITTEN}
        sectionTitle="Experience"
        onAccept={onAccept}
        onReject={onReject}
      />,
    );

    expect(screen.getByText("Experience")).toBeDefined();
    expect(screen.getByText(/Helped with project delivery/)).toBeDefined();
    expect(screen.getByText(/Led cross-functional/)).toBeDefined();
    expect(screen.getByText(/Stronger action verb/)).toBeDefined();
    expect(screen.getByText("leadership")).toBeDefined();
  });

  it("calls onAccept when accept button clicked", () => {
    render(
      <RewriteCard
        rewrite={REWRITE_REWRITTEN}
        sectionTitle="Experience"
        onAccept={onAccept}
        onReject={onReject}
      />,
    );

    fireEvent.click(screen.getByText("Accept"));
    expect(onAccept).toHaveBeenCalledWith("rw-1");
  });

  it("calls onReject when reject button clicked", () => {
    render(
      <RewriteCard
        rewrite={REWRITE_REWRITTEN}
        sectionTitle="Experience"
        onAccept={onAccept}
        onReject={onReject}
      />,
    );

    fireEvent.click(screen.getByText("Reject"));
    expect(onReject).toHaveBeenCalledWith("rw-1");
  });

  it("shows accepted state when accepted=true", () => {
    const accepted: Rewrite = { ...REWRITE_REWRITTEN, accepted: true };
    render(
      <RewriteCard
        rewrite={accepted}
        sectionTitle="Experience"
        onAccept={onAccept}
        onReject={onReject}
      />,
    );

    expect(screen.getByText("Accepted")).toBeDefined();
  });

  it("shows rejected state when accepted=false", () => {
    const rejected: Rewrite = { ...REWRITE_REWRITTEN, accepted: false };
    render(
      <RewriteCard
        rewrite={rejected}
        sectionTitle="Experience"
        onAccept={onAccept}
        onReject={onReject}
      />,
    );

    expect(screen.getByText("Rejected")).toBeDefined();
  });

  it("renders LearningPathCard for MISSING classification", () => {
    render(
      <RewriteCard
        rewrite={MISSING_WITH_PATH}
        sectionTitle="Skills"
        onAccept={onAccept}
        onReject={onReject}
        learningPath={LEARNING_PATH}
      />,
    );

    expect(screen.getByText("Learning Path")).toBeDefined();
    expect(screen.getByText("3–6 months")).toBeDefined();
  });
});

// ── LearningPathCard ─────────────────────────────────────────

describe("LearningPathCard", () => {
  it("renders courses, projects, and timeline", () => {
    render(<LearningPathCard {...LEARNING_PATH} />);

    expect(screen.getByText("Learning Path")).toBeDefined();
    expect(screen.getByText("Rust by Example")).toBeDefined();
    expect(screen.getByText("Build a CLI tool")).toBeDefined();
    expect(screen.getByText("3–6 months")).toBeDefined();
  });

  it("renders target bullet", () => {
    render(<LearningPathCard {...LEARNING_PATH} />);

    expect(screen.getByText(/Built high-performance CLI tool/)).toBeDefined();
  });
});

// ── RewriteManager ───────────────────────────────────────────

describe("RewriteManager", () => {
  const rewrites = [REWRITE_REWRITTEN, REWRITE_REFRAMED, REWRITE_MISSING];
  const onAccept = vi.fn();
  const onReject = vi.fn();
  const onAcceptAll = vi.fn();
  const onRejectAll = vi.fn();

  it("renders stats summary", () => {
    render(
      <RewriteManager
        rewrites={rewrites}
        stats={{ rewritten: 1, reframed: 1, missing: 1, total: 3 }}
        onAccept={onAccept}
        onReject={onReject}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />,
    );

    expect(screen.getByText("Rewritten")).toBeDefined();
    expect(screen.getByText("Reframed")).toBeDefined();
    expect(screen.getByText("Missing")).toBeDefined();
  });

  it("renders all rewrites by default", () => {
    render(
      <RewriteManager
        rewrites={rewrites}
        stats={{ rewritten: 1, reframed: 1, missing: 1, total: 3 }}
        onAccept={onAccept}
        onReject={onReject}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />,
    );

    expect(screen.getByText(/Helped with project delivery/)).toBeDefined();
    expect(screen.getByText(/Used Docker/)).toBeDefined();
    expect(screen.getByText(/No Rust experience/)).toBeDefined();
  });

  it("calls onAcceptAll when Accept All clicked", () => {
    render(
      <RewriteManager
        rewrites={rewrites}
        stats={{ rewritten: 1, reframed: 1, missing: 1, total: 3 }}
        onAccept={onAccept}
        onReject={onReject}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />,
    );

    fireEvent.click(screen.getByText("Accept All"));
    expect(onAcceptAll).toHaveBeenCalled();
  });

  it("calls onRejectAll when Reject All clicked", () => {
    render(
      <RewriteManager
        rewrites={rewrites}
        stats={{ rewritten: 1, reframed: 1, missing: 1, total: 3 }}
        onAccept={onAccept}
        onReject={onReject}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />,
    );

    fireEvent.click(screen.getByText("Reject All"));
    expect(onRejectAll).toHaveBeenCalled();
  });

  it("filters rewrites by classification", () => {
    render(
      <RewriteManager
        rewrites={rewrites}
        stats={{ rewritten: 1, reframed: 1, missing: 1, total: 3 }}
        onAccept={onAccept}
        onReject={onReject}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />,
    );

    // Click MISSING filter
    fireEvent.click(screen.getByRole("button", { name: /MISSING/i }));

    // Should show only MISSING rewrite
    expect(screen.getByText(/No Rust experience/)).toBeDefined();
    expect(screen.queryByText(/Helped with project delivery/)).toBeNull();
    expect(screen.queryByText(/Used Docker/)).toBeNull();
  });
});

// ── TailorResults ────────────────────────────────────────────

describe("TailorResults", () => {
  const sectionTitles = new Map([
    ["section-0", "Experience"],
    ["section-1", "Skills"],
  ]);

  const onAccept = vi.fn();
  const onReject = vi.fn();
  const onAcceptAll = vi.fn();
  const onRejectAll = vi.fn();

  it("renders loading state during tailoring", () => {
    render(
      <TailorResults
        tailorPhase="tailoring"
        tailorProgress={{ sectionId: "section-0", sectionTitle: "Experience", index: 0, total: 3 }}
        rewrites={[]}
        stats={null}
        sectionTitles={sectionTitles}
        onAccept={onAccept}
        onReject={onReject}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />,
    );

    expect(screen.getByText(/Tailoring in Progress/)).toBeDefined();
    expect(screen.getByText(/Experience/)).toBeDefined();
  });

  it("renders complete state with rewrites", () => {
    render(
      <TailorResults
        tailorPhase="complete"
        tailorProgress={null}
        rewrites={[REWRITE_REWRITTEN, REWRITE_MISSING]}
        stats={{ rewritten: 1, reframed: 0, missing: 1, total: 2 }}
        sectionTitles={sectionTitles}
        onAccept={onAccept}
        onReject={onReject}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />,
    );

    expect(screen.getByText(/Resume Tailoring Results/)).toBeDefined();
    expect(screen.getByText(/Helped with project delivery/)).toBeDefined();
    expect(screen.getByText(/No Rust experience/)).toBeDefined();
  });

  it("renders error state", () => {
    render(
      <TailorResults
        tailorPhase="error"
        tailorProgress={null}
        rewrites={[]}
        stats={null}
        sectionTitles={sectionTitles}
        onAccept={onAccept}
        onReject={onReject}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />,
    );

    expect(screen.getByText(/Tailoring Failed/)).toBeDefined();
  });

  it("renders empty state when complete with no rewrites", () => {
    render(
      <TailorResults
        tailorPhase="complete"
        tailorProgress={null}
        rewrites={[]}
        stats={{ rewritten: 0, reframed: 0, missing: 0, total: 0 }}
        sectionTitles={sectionTitles}
        onAccept={onAccept}
        onReject={onReject}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />,
    );

    expect(screen.getByText(/No rewrites needed/)).toBeDefined();
  });
});

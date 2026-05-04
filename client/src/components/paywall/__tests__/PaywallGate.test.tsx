import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PaywallGate from "../PaywallGate";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn();
vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseStore = vi.fn();
vi.mock("../../../store/useStore", () => ({
  useStore: (selector: (state: { usage: { used: number; limit: number; remaining: number } | null }) => unknown) =>
    selector(mockUseStore()),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const authedUser = { id: "1", email: "a@b.com", name: "Test", picture: null };

const defaultAuthState = {
  user: authedUser,
  token: "tok",
  isLoggedIn: true,
  isLoading: false,
};

const guestAuthState = {
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: false,
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("PaywallGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when user is authenticated with remaining quota", () => {
    mockUseAuth.mockReturnValue(defaultAuthState);
    mockUseStore.mockReturnValue({ usage: { used: 2, limit: 10, remaining: 8 } });

    render(
      <PaywallGate feature="editor_edit">
        <div>Editor content</div>
      </PaywallGate>,
    );

    expect(screen.getByText("Editor content")).toBeInTheDocument();
  });

  it("shows fallback when user is a guest (no user)", () => {
    mockUseAuth.mockReturnValue(guestAuthState);
    mockUseStore.mockReturnValue({ usage: null });

    render(
      <PaywallGate feature="editor_edit">
        <div>Editor content</div>
      </PaywallGate>,
    );

    expect(screen.queryByText("Editor content")).not.toBeInTheDocument();
    expect(screen.getByText(/sign in to edit/i)).toBeInTheDocument();
  });

  it("shows fallback when usage is exhausted (remaining = 0)", () => {
    mockUseAuth.mockReturnValue(defaultAuthState);
    mockUseStore.mockReturnValue({ usage: { used: 10, limit: 10, remaining: 0 } });

    render(
      <PaywallGate feature="editor_edit">
        <div>Editor content</div>
      </PaywallGate>,
    );

    expect(screen.queryByText("Editor content")).not.toBeInTheDocument();
    expect(screen.getByText(/upgrade to edit your resume/i)).toBeInTheDocument();
  });

  it("renders children when usage is null but user is authenticated (usage not yet loaded)", () => {
    mockUseAuth.mockReturnValue(defaultAuthState);
    mockUseStore.mockReturnValue({ usage: null });

    render(
      <PaywallGate feature="editor_edit">
        <div>Editor content</div>
      </PaywallGate>,
    );

    // Authenticated user with usage not loaded yet should still see content
    // (usage will load asynchronously)
    expect(screen.getByText("Editor content")).toBeInTheDocument();
  });

  it("shows feature-specific message for pdf_download when guest", () => {
    mockUseAuth.mockReturnValue(guestAuthState);
    mockUseStore.mockReturnValue({ usage: null });

    render(
      <PaywallGate feature="pdf_download">
        <div>Download button</div>
      </PaywallGate>,
    );

    expect(screen.queryByText("Download button")).not.toBeInTheDocument();
    expect(screen.getByText(/sign in to download pdf/i)).toBeInTheDocument();
  });

  it("shows custom fallback when provided and access denied", () => {
    mockUseAuth.mockReturnValue(guestAuthState);
    mockUseStore.mockReturnValue({ usage: null });

    render(
      <PaywallGate feature="editor_edit" fallback={<div>Custom locked</div>}>
        <div>Editor content</div>
      </PaywallGate>,
    );

    expect(screen.queryByText("Editor content")).not.toBeInTheDocument();
    expect(screen.getByText("Custom locked")).toBeInTheDocument();
  });

  it("renders children for full_issues when authenticated with remaining quota", () => {
    mockUseAuth.mockReturnValue(defaultAuthState);
    mockUseStore.mockReturnValue({ usage: { used: 2, limit: 10, remaining: 8 } });

    render(
      <PaywallGate feature="full_issues">
        <div>All issues</div>
      </PaywallGate>,
    );

    expect(screen.getByText("All issues")).toBeInTheDocument();
  });

  it("renders children for tailor when authenticated with remaining quota", () => {
    mockUseAuth.mockReturnValue(defaultAuthState);
    mockUseStore.mockReturnValue({ usage: { used: 2, limit: 10, remaining: 8 } });

    render(
      <PaywallGate feature="tailor">
        <div>Tailor feature</div>
      </PaywallGate>,
    );

    expect(screen.getByText("Tailor feature")).toBeInTheDocument();
  });
});

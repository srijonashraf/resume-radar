import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaywallModal from "../PaywallModal";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("PaywallModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    isGuest: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upgrade message for authenticated users", () => {
    render(<PaywallModal {...defaultProps} />);

    expect(screen.getByText(/this feature requires a premium account/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upgrade now/i })).toBeInTheDocument();
  });

  it("shows sign-in button for guests", () => {
    render(<PaywallModal {...defaultProps} isGuest={true} />);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("does not show sign-in button for authenticated users", () => {
    render(<PaywallModal {...defaultProps} isGuest={false} />);

    expect(screen.queryByRole("button", { name: /sign in$/i })).not.toBeInTheDocument();
  });

  it("renders close button", () => {
    render(<PaywallModal {...defaultProps} />);

    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PaywallModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when isOpen is false", () => {
    render(<PaywallModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText(/this feature requires a premium account/i)).not.toBeInTheDocument();
  });

  it("calls onClose when overlay backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PaywallModal {...defaultProps} onClose={onClose} />);

    // Click the overlay backdrop (the outermost div)
    const backdrop = screen.getByRole("dialog").parentElement!;
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

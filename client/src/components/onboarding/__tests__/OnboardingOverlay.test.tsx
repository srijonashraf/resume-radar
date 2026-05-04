import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingOverlay from "../OnboardingOverlay";

const STORAGE_KEY = "resumetra_onboarding_complete";

describe("OnboardingOverlay", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -- Rendering --

  it("renders on first visit (no localStorage flag)", () => {
    render(<OnboardingOverlay />);
    expect(screen.getByText("Upload Your Resume")).toBeInTheDocument();
  });

  it("does not render when localStorage flag is set", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    render(<OnboardingOverlay />);
    expect(screen.queryByText("Upload Your Resume")).not.toBeInTheDocument();
  });

  // -- Step navigation --

  it("steps progress forward when Next is clicked", async () => {
    const user = userEvent.setup();
    render(<OnboardingOverlay />);

    // Step 1
    expect(screen.getByText("Upload Your Resume")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Step 2
    expect(screen.getByText("Get Scored")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Step 3
    expect(screen.getByText("Tailor to Any Job")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Step 4
    expect(screen.getByText("Edit & Export")).toBeInTheDocument();
  });

  it("steps progress backward when Back is clicked", async () => {
    const user = userEvent.setup();
    render(<OnboardingOverlay />);

    // Advance to step 2
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Get Scored")).toBeInTheDocument();

    // Go back
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText("Upload Your Resume")).toBeInTheDocument();
  });

  // -- Skip --

  it("Skip dismisses overlay without setting localStorage flag", async () => {
    const user = userEvent.setup();
    const { container } = render(<OnboardingOverlay />);

    // Overlay is visible
    expect(screen.getByText("Upload Your Resume")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /skip/i }));

    // Overlay is gone
    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });

    // Flag is NOT set
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // -- "Don't show again" --

  it('"Don\'t show again" checkbox sets localStorage flag on final step', async () => {
    const user = userEvent.setup();
    render(<OnboardingOverlay />);

    // Advance to step 4
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Edit & Export")).toBeInTheDocument();

    // Check "Don't show again"
    const checkbox = screen.getByRole("checkbox", { name: /don't show again/i });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    // Click Get Started (final step finish button)
    await user.click(screen.getByRole("button", { name: /get started/i }));

    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  // -- Step indicators --

  it("step indicators reflect current step", async () => {
    const user = userEvent.setup();
    render(<OnboardingOverlay />);

    const indicators = screen.getAllByRole("tab");
    expect(indicators).toHaveLength(4);

    // First indicator is active
    expect(indicators[0]).toHaveAttribute("aria-selected", "true");
    expect(indicators[1]).toHaveAttribute("aria-selected", "false");

    // Move to step 2
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(indicators[0]).toHaveAttribute("aria-selected", "false");
    expect(indicators[1]).toHaveAttribute("aria-selected", "true");
  });
});

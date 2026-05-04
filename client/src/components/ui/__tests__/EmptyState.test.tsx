import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmptyState from "../EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No analyses yet" description="Upload a resume to get started" />);

    expect(screen.getByText("No analyses yet")).toBeInTheDocument();
    expect(screen.getByText("Upload a resume to get started")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    render(
      <EmptyState
        icon={<span data-testid="custom-icon">📄</span>}
        title="No data"
      />,
    );

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders action button when provided and calls onClick", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <EmptyState
        title="No data"
        action={{ label: "Upload Resume", onClick }}
      />,
    );

    const button = screen.getByRole("button", { name: /upload resume/i });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not render action button when not provided", () => {
    render(<EmptyState title="No data" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    render(<EmptyState title="No data" />);

    // Only the title heading should exist; no description paragraph
    // There should be no <p> element for description
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });
});

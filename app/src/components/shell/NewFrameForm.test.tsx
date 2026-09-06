// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { NewFrameForm } from "./NewFrameForm";

describe("NewFrameForm — only name + location are required (Task 10 decision)", () => {
  it("disables Add Frame until a name is entered", async () => {
    const user = userEvent.setup();
    render(<NewFrameForm lat={45.8} lon={15.9} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Add Frame")).toBeDisabled();
    await user.type(screen.getByPlaceholderText("Name this place"), "Ozalj");
    expect(screen.getByText("Add Frame")).not.toBeDisabled();
  });

  it("rejects a whitespace-only name", async () => {
    const user = userEvent.setup();
    render(<NewFrameForm lat={45.8} lon={15.9} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText("Name this place"), "   ");
    expect(screen.getByText("Add Frame")).toBeDisabled();
  });

  it("calls onSave with the trimmed name and the given coordinates, nothing else required", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<NewFrameForm lat={45.8} lon={15.9} onSave={onSave} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText("Name this place"), "  Ozalj  ");
    await user.click(screen.getByText("Add Frame"));
    expect(onSave).toHaveBeenCalledWith({ name: "Ozalj", lat: 45.8, lon: 15.9 });
  });

  it("also saves on Enter", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<NewFrameForm lat={45.8} lon={15.9} onSave={onSave} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText("Name this place"), "Ozalj{Enter}");
    expect(onSave).toHaveBeenCalledWith({ name: "Ozalj", lat: 45.8, lon: 15.9 });
  });

  it("does not save on Enter with an empty name", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<NewFrameForm lat={45.8} lon={15.9} onSave={onSave} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText("Name this place"), "{Enter}");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onCancel when closed", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<NewFrameForm lat={45.8} lon={15.9} onSave={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByLabelText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("NewFrameForm — no photo required at creation (Task 10 decision)", () => {
  it("never renders an image or a file input", () => {
    const { container } = render(<NewFrameForm lat={45.8} lon={15.9} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("shows the same unprinted placeholder FrameCard uses — a new frame starts life there", () => {
    render(<NewFrameForm lat={45.8} lon={15.9} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("not visited yet")).toBeInTheDocument();
  });
});

describe("NewFrameForm — location display", () => {
  it("labels the coordinates rather than showing bare numbers", () => {
    render(<NewFrameForm lat={45.8} lon={15.9} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("45.8000°N, 15.9000°E")).toBeInTheDocument();
  });

  it("handles southern/western coordinates correctly", () => {
    render(<NewFrameForm lat={-33.5} lon={-70.6} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("33.5000°S, 70.6000°W")).toBeInTheDocument();
  });
});

describe("NewFrameForm — accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(<NewFrameForm lat={45.8} lon={15.9} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

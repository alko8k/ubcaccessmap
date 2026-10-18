import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RatingControl } from "./RatingControl.tsx";

afterEach(cleanup);

describe("RatingControl", () => {
  it("is a named group of five choices with the current value checked", () => {
    render(<RatingControl label="Cleanliness" value={3} onChange={() => undefined} />);

    const group = screen.getByRole("group", { name: "Cleanliness" });
    expect(group).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect((screen.getByRole("radio", { name: "3 out of 5" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("reports the score that was picked", () => {
    const onChange = vi.fn();
    render(<RatingControl label="Privacy" value={3} onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "5 out of 5" }));

    expect(onChange).toHaveBeenCalledWith(5);
  });
});

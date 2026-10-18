import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomSheet } from "./BottomSheet.tsx";

afterEach(cleanup);

describe("BottomSheet", () => {
  it("toggles from its handle button, which reports the sheet's state", () => {
    const onExpandedChange = vi.fn();
    render(
      <BottomSheet
        label="washroom list"
        expanded={false}
        onExpandedChange={onExpandedChange}
        peek={<p>27 washrooms</p>}
      >
        <p>Rows</p>
      </BottomSheet>,
    );

    const handle = screen.getByRole("button", { name: "Expand washroom list" });
    expect(handle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(handle);

    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("27 washrooms")).toBeTruthy();
  });
});

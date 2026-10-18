import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultFilters } from "../../lib/filters.ts";
import { FilterBar } from "./FilterBar.tsx";

afterEach(cleanup);

describe("FilterBar", () => {
  it("toggles an accessibility fact chip", () => {
    const onChange = vi.fn();
    render(<FilterBar filters={defaultFilters} onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Grab bars" }));

    expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, grabBars: true });
  });

  it("clears refinements but keeps the search text", () => {
    const onChange = vi.fn();
    render(
      <FilterBar
        filters={{ ...defaultFilters, q: "nest", rank: "A", grabBars: true }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /clear \(2\)/i }));

    expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, q: "nest" });
  });
});

import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  defaultFilters,
  filtersFromSearch,
  searchFromFilters,
  tagLabel,
} from "./filters.ts";

describe("filter URL state", () => {
  it("round-trips selected filters through the query string", () => {
    const filters = {
      ...defaultFilters,
      q: "nest",
      accessibleStall: true,
      genderType: "all_gender" as const,
    };

    expect(filtersFromSearch(searchFromFilters(filters))).toEqual(filters);
  });

  it("treats an empty search as the default filter set", () => {
    expect(filtersFromSearch("")).toEqual(defaultFilters);
  });

  it("counts refinements but not the search box", () => {
    expect(activeFilterCount(defaultFilters)).toBe(0);
    expect(
      activeFilterCount({ ...defaultFilters, q: "nest", rank: "A", grabBars: true }),
    ).toBe(2);
  });
});

describe("tagLabel", () => {
  it("turns a tag slug into a readable label", () => {
    expect(tagLabel("usually-available")).toBe("Usually available");
  });
});

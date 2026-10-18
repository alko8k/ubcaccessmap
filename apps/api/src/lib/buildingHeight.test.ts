import { describe, expect, it } from "vitest";
import { buildingHeight } from "./buildingHeight.js";

describe("buildingHeight", () => {
  it("uses the measured height when there is one", () => {
    expect(buildingHeight(26.87, 5)).toBe(26.9);
  });

  it("falls back to the floor count", () => {
    expect(buildingHeight(null, 5)).toBe(19);
    expect(buildingHeight(0, 2)).toBe(7.6);
  });

  it("returns null when neither is known", () => {
    expect(buildingHeight(undefined, undefined)).toBeNull();
    expect(buildingHeight(-1, 0)).toBeNull();
  });
});

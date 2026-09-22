import { describe, expect, it } from "vitest";
import { isAllowedUbcEmail } from "./domains.js";

describe("isAllowedUbcEmail", () => {
  it("accepts student and staff UBC domains", () => {
    expect(isAllowedUbcEmail("jane@student.ubc.ca")).toBe(true);
    expect(isAllowedUbcEmail("jane@ubc.ca")).toBe(true);
  });

  it("rejects other schools and plus-domain tricks that leave the host", () => {
    expect(isAllowedUbcEmail("jane@gmail.com")).toBe(false);
    expect(isAllowedUbcEmail("jane@ubc.ca.evil.com")).toBe(false);
    expect(isAllowedUbcEmail("not-an-email")).toBe(false);
  });
});

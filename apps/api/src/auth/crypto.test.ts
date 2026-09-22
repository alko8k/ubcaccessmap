import { describe, expect, it } from "vitest";
import { displayNameFromEmail, hashSecret, randomToken, secretsEqual } from "./crypto.js";

describe("auth crypto", () => {
  it("creates unique URL-safe tokens", () => {
    const first = randomToken();
    const second = randomToken();
    expect(first).not.toEqual(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes tokens with the server secret", () => {
    const hashed = hashSecret("token", "secret");
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toEqual(hashSecret("token", "other-secret"));
    expect(secretsEqual(hashed, hashSecret("token", "secret"))).toBe(true);
  });

  it("builds a non-identifying display name from the local part", () => {
    expect(displayNameFromEmail("ada.lovelace@student.ubc.ca")).toBe("ada lovelace");
  });
});

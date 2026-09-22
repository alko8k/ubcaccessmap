import { describe, expect, it } from "vitest";
import { adminEmails, loadEnv } from "./env.js";

describe("loadEnv", () => {
  it("requires a database URL and session secret", () => {
    expect(() => loadEnv({ NODE_ENV: "test" })).toThrow(/Invalid environment/);
  });

  it("parses admin emails into a set", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      SESSION_SECRET: "a-very-long-secret",
      ADMIN_EMAILS: "one@ubc.ca, two@ubc.ca",
    });

    expect(adminEmails(env)).toEqual(new Set(["one@ubc.ca", "two@ubc.ca"]));
  });
});

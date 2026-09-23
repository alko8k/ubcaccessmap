import { describe, expect, it } from "vitest";
import { createEmailAdapter, createLazyEmailAdapter } from "./factory.js";
import type { Env } from "../env.js";

const productionEnvWithoutSmtp: Env = {
  NODE_ENV: "production",
  PORT: 4000,
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  WEB_ORIGIN: "https://example.com",
  API_ORIGIN: "https://example.com",
  SESSION_SECRET: "test-session-secret",
  ADMIN_EMAILS: "",
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PORT: 465,
  COOKIE_SECURE: true,
};

describe("email adapter construction in production without SMTP", () => {
  it("throws eagerly, which is why the long-running server fails fast", () => {
    expect(() => createEmailAdapter(productionEnvWithoutSmtp)).toThrow(/SMTP_USER/);
  });

  it("does not throw when built lazily, so public routes keep serving", () => {
    expect(() => createLazyEmailAdapter(productionEnvWithoutSmtp)).not.toThrow();
  });

  it("still fails loudly on the request that actually needs email", () => {
    const adapter = createLazyEmailAdapter(productionEnvWithoutSmtp);
    expect(() =>
      adapter.sendMagicLink({ to: "someone@student.ubc.ca", verifyUrl: "https://example.com/v" }),
    ).toThrow(/SMTP_USER/);
  });
});

import type { Env } from "../env.js";
import type { EmailAdapter } from "./adapter.js";
import { createMemoryEmailAdapter } from "./memory.js";
import { createSmtpEmailAdapter } from "./smtp.js";

/**
 * Picks the email adapter for the current environment.
 *
 * Falls back to the in-memory adapter when SMTP is not configured, so the app
 * still runs offline and in tests. That adapter logs the link instead of
 * sending it, which is only acceptable outside production — a deployed app
 * that quietly logs sign-in links is a broken login that looks healthy.
 *
 * Shared by the long-running server and the serverless entry point.
 */
export function createEmailAdapter(env: Env): EmailAdapter {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "SMTP_USER and SMTP_PASS are required in production: refusing to start with an email adapter that cannot send.",
      );
    }
    console.warn("[email] SMTP is not configured. Sign-in links will be logged, not sent.");
    return createMemoryEmailAdapter();
  }

  console.info(`[email] Sending sign-in links via ${env.SMTP_HOST} as ${env.SMTP_USER}.`);
  return createSmtpEmailAdapter({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM ?? `UBC Access Map <${env.SMTP_USER}>`,
  });
}

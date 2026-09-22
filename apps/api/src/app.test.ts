import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { createMemoryEmailAdapter } from "./email/memory.js";
import type { Env } from "./env.js";

const env: Env = {
  NODE_ENV: "test",
  PORT: 4000,
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  WEB_ORIGIN: "http://localhost:5173",
  API_ORIGIN: "http://localhost:4000",
  SESSION_SECRET: "test-session-secret",
  ADMIN_EMAILS: "",
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PORT: 465,
  COOKIE_SECURE: false,
};

function prismaStub() {
  return {
    session: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  };
}

describe("createApp health", () => {
  it("returns a live health payload without a database cookie lookup", async () => {
    const app = createApp({
      prisma: prismaStub() as never,
      email: createMemoryEmailAdapter(),
      env,
    });

    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "ubc-access-map-api",
    });
  });
});

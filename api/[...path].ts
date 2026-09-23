import { createApp } from "../apps/api/src/app.js";
import { createLazyEmailAdapter } from "../apps/api/src/email/factory.js";
import { loadEnv } from "../apps/api/src/env.js";
import { prisma } from "../apps/api/src/prisma.js";

/*
 * Serverless entry point.
 *
 * The [...path] filename is Vercel's catch-all convention: it matches every
 * /api/* path at any depth and invokes the exported Express app as the
 * handler, leaving req.url as the original path. That matters because the
 * routers declare full paths (router.get("/api/health", ...)), so Express must
 * see /api/health rather than a rewritten stub. A plain index.ts would map to
 * the single URL /api and every other route would 404 at the edge. Unlike src/server.ts there is no listen() call and no
 * dotenv import: the platform injects environment variables directly, and the
 * runtime owns the socket.
 *
 * Module scope runs once per warm instance, so the env parse, email adapter,
 * and Prisma client are built once and reused across invocations.
 */
const env = loadEnv();

/*
 * The email adapter is built lazily. Constructing it here would throw on cold
 * start whenever SMTP is unconfigured in production, which would take down the
 * public read-only routes (/api/map, /api/search, /api/health) along with
 * sign-in. Sign-in still fails loudly on the request that needs email; a
 * warning here keeps the misconfiguration from being silent.
 */
if (env.NODE_ENV === "production" && (!env.SMTP_USER || !env.SMTP_PASS)) {
  console.warn(
    "[email] SMTP is not configured. Read-only routes will serve normally; sign-in will fail until SMTP_USER and SMTP_PASS are set.",
  );
}

export default createApp({
  prisma,
  email: createLazyEmailAdapter(env),
  env,
});

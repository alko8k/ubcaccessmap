import { createApp } from "../apps/api/src/app.js";
import { createLazyEmailAdapter } from "../apps/api/src/email/factory.js";
import { loadEnv } from "../apps/api/src/env.js";
import { prisma } from "../apps/api/src/prisma.js";

/*
 * Serverless entry point.
 *
 * On its own this file only serves the single URL /api. The rewrite in
 * vercel.json sends every /api/* path, at any depth, here. A rewrite leaves
 * req.url as the original path, which matters because the routers declare
 * full paths (router.get("/api/health", ...)), so Express must see
 * /api/health rather than /api. Don't rename this to [...path].ts: outside
 * Next.js that filename matches only one segment, so /api/auth/me and every
 * other nested route 404 at the edge. Unlike src/server.ts there is no listen() call and no
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

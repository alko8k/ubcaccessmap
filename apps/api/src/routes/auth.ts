import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { requestMagicLinkSchema, verifyMagicLinkSchema } from "@ubc-access-map/shared";
import { adminEmails, type Env } from "../env.js";
import type { EmailAdapter } from "../email/adapter.js";
import { displayNameFromEmail, emailDomain, hashSecret, randomToken } from "../auth/crypto.js";
import { badRequest, unauthorized } from "../errors.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function authRouter(options: {
  prisma: PrismaClient;
  email: EmailAdapter;
  env: Env;
}) {
  const router = Router();
  const emailLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
  const ipLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

  router.post("/api/auth/request-link", async (request, response, next) => {
    try {
      const parsed = requestMagicLinkSchema.safeParse(request.body);
      if (!parsed.success) {
        throw badRequest("Enter a valid UBC email address.", parsed.error.flatten());
      }

      const email = parsed.data.email;
      ipLimiter(request.ip ?? "unknown");
      emailLimiter(email);

      const token = randomToken();
      const tokenHash = hashSecret(token, options.env.SESSION_SECRET);

      await options.prisma.magicLinkToken.create({
        data: {
          email,
          tokenHash,
          expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
        },
      });

      const verifyUrl = `${options.env.WEB_ORIGIN}/auth/verify?token=${encodeURIComponent(token)}`;
      await options.email.sendMagicLink({ to: email, verifyUrl });

      response.status(200).json({
        ok: true,
        message: "If that inbox exists, a sign-in link is on its way.",
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/auth/verify", async (request, response, next) => {
    try {
      const parsed = verifyMagicLinkSchema.safeParse(request.body);
      if (!parsed.success) {
        throw badRequest("That sign-in link is invalid.");
      }

      const tokenHash = hashSecret(parsed.data.token, options.env.SESSION_SECRET);
      const record = await options.prisma.magicLinkToken.findUnique({
        where: { tokenHash },
      });

      if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
        throw unauthorized("That sign-in link has expired. Request a new one.");
      }

      const admins = adminEmails(options.env);
      const user = await options.prisma.user.upsert({
        where: { email: record.email },
        update: {
          lastLoginAt: new Date(),
          role: admins.has(record.email) ? "ADMIN" : undefined,
        },
        create: {
          email: record.email,
          emailDomain: emailDomain(record.email),
          displayName: displayNameFromEmail(record.email),
          role: admins.has(record.email) ? "ADMIN" : "USER",
          lastLoginAt: new Date(),
        },
      });

      await options.prisma.magicLinkToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      const sessionToken = randomToken();
      await options.prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: hashSecret(sessionToken, options.env.SESSION_SECRET),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      });

      response.cookie("uam_session", sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: options.env.COOKIE_SECURE ?? options.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_TTL_MS,
      });

      response.status(200).json({
        user: {
          id: user.id,
          displayName: user.displayName,
          role: user.role,
          emailDomain: user.emailDomain,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/auth/me", (request, response) => {
    if (!request.user) {
      response.status(200).json({ user: null });
      return;
    }

    response.status(200).json({
      user: {
        id: request.user.id,
        displayName: request.user.displayName,
        role: request.user.role,
        emailDomain: request.user.emailDomain,
      },
    });
  });

  router.post("/api/auth/logout", async (request, response, next) => {
    try {
      const token = request.cookies?.uam_session as string | undefined;
      if (token) {
        await options.prisma.session.deleteMany({
          where: { tokenHash: hashSecret(token, options.env.SESSION_SECRET) },
        });
      }

      response.clearCookie("uam_session", { path: "/" });
      response.status(200).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  if (options.env.NODE_ENV !== "production") {
    router.get("/api/dev/magic-link", (request, response) => {
      const email = String(request.query.email ?? "").toLowerCase();
      response.status(200).json({
        url: options.email.getLatestMagicLink?.(email) ?? null,
      });
    });
  }

  return router;
}

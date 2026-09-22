import type { PrismaClient } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import type { Env } from "../env.js";
import { hashSecret } from "../auth/crypto.js";
import { forbidden, unauthorized } from "../errors.js";

export function sessionMiddleware(prisma: PrismaClient, env: Env) {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const token = request.cookies?.uam_session as string | undefined;
      if (!token) {
        next();
        return;
      }

      const session = await prisma.session.findUnique({
        where: { tokenHash: hashSecret(token, env.SESSION_SECRET) },
        include: { user: true },
      });

      if (!session || session.expiresAt.getTime() < Date.now()) {
        next();
        return;
      }

      request.user = {
        id: session.user.id,
        displayName: session.user.displayName,
        role: session.user.role,
        emailDomain: session.user.emailDomain,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireUser(request: Request, _response: Response, next: NextFunction) {
  if (!request.user) {
    next(unauthorized());
    return;
  }

  next();
}

export function requireAdmin(request: Request, _response: Response, next: NextFunction) {
  if (!request.user) {
    next(unauthorized());
    return;
  }

  if (request.user.role !== "ADMIN") {
    next(forbidden());
    return;
  }

  next();
}

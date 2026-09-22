import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import type { PrismaClient } from "@prisma/client";
import type { Env } from "./env.js";
import type { EmailAdapter } from "./email/adapter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { sessionMiddleware } from "./middleware/session.js";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { mapRouter } from "./routes/map.js";
import { reportRouter } from "./routes/reports.js";
import { washroomRouter } from "./routes/washrooms.js";

export type AppDeps = {
  prisma: PrismaClient;
  email: EmailAdapter;
  env: Env;
};

export function createApp(deps: AppDeps) {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: deps.env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use(sessionMiddleware(deps.prisma, deps.env));

  app.use(healthRouter(deps.prisma));
  app.use(authRouter(deps));
  app.use(mapRouter(deps.prisma));
  app.use(washroomRouter(deps.prisma));
  app.use(reportRouter(deps.prisma));

  app.use(errorHandler);
  return app;
}

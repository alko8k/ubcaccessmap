import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { upsertRatingSchema } from "@ubc-access-map/shared";
import { badRequest, notFound } from "../errors.js";
import { refreshWashroomRank } from "../lib/refreshRank.js";
import { toWashroomDetail } from "../lib/serialize.js";
import { requireUser } from "../middleware/session.js";
import { routeId } from "../lib/routeId.js";

const washroomInclude = {
  building: true,
  attributes: true,
  ratings: true,
} as const;

export function washroomRouter(prisma: PrismaClient) {
  const router = Router();

  router.get("/api/washrooms/:id", async (request, response, next) => {
    try {
      const id = routeId(request.params.id);
      const washroom = await prisma.washroom.findUnique({
        where: { id: id ?? "" },
        include: washroomInclude,
      });

      if (!washroom) {
        throw notFound("That washroom is not in the directory yet.");
      }

      response.status(200).json(toWashroomDetail(washroom, request.user?.id));
    } catch (error) {
      next(error);
    }
  });

  router.put("/api/washrooms/:id/rating", requireUser, async (request, response, next) => {
    try {
      const parsed = upsertRatingSchema.safeParse(request.body);
      if (!parsed.success) {
        throw badRequest("Ratings must be whole numbers from 1 to 5.", parsed.error.flatten());
      }

      const id = routeId(request.params.id);
      const washroom = await prisma.washroom.findUnique({
        where: { id: id ?? "" },
      });
      if (!washroom) {
        throw notFound("That washroom is not in the directory yet.");
      }

      await prisma.rating.upsert({
        where: {
          userId_washroomId: {
            userId: request.user!.id,
            washroomId: washroom.id,
          },
        },
        update: parsed.data,
        create: {
          userId: request.user!.id,
          washroomId: washroom.id,
          ...parsed.data,
        },
      });

      await refreshWashroomRank(prisma, washroom.id);
      const detailed = await prisma.washroom.findUniqueOrThrow({
        where: { id: washroom.id },
        include: washroomInclude,
      });

      response.status(200).json(toWashroomDetail(detailed, request.user!.id));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

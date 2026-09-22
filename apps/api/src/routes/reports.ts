import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { createReportSchema, updateReportSchema } from "@ubc-access-map/shared";
import { badRequest, notFound } from "../errors.js";
import { requireAdmin, requireUser } from "../middleware/session.js";
import { routeId } from "../lib/routeId.js";

export function reportRouter(prisma: PrismaClient) {
  const router = Router();

  router.post("/api/washrooms/:id/reports", requireUser, async (request, response, next) => {
    try {
      const parsed = createReportSchema.safeParse(request.body);
      if (!parsed.success) {
        throw badRequest("Please describe what should be corrected.", parsed.error.flatten());
      }

      const washroom = await prisma.washroom.findUnique({
        where: { id: routeId(request.params.id) ?? "" },
      });
      if (!washroom) {
        throw notFound("That washroom is not in the directory yet.");
      }

      const report = await prisma.report.create({
        data: {
          washroomId: washroom.id,
          userId: request.user!.id,
          type: parsed.data.type,
          message: parsed.data.message,
        },
      });

      response.status(201).json({ id: report.id, status: report.status });
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/admin/reports", requireAdmin, async (_request, response, next) => {
    try {
      const reports = await prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          washroom: {
            include: { building: true },
          },
        },
      });

      response.status(200).json({
        reports: reports.map((report) => ({
          id: report.id,
          washroomId: report.washroomId,
          washroomName: report.washroom.name,
          buildingName: report.washroom.building.name,
          type: report.type,
          message: report.message,
          status: report.status,
          createdAt: report.createdAt.toISOString(),
          reviewerNote: report.reviewerNote,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/api/admin/reports/:id", requireAdmin, async (request, response, next) => {
    try {
      const parsed = updateReportSchema.safeParse(request.body);
      if (!parsed.success) {
        throw badRequest("Invalid moderation update.", parsed.error.flatten());
      }

      const report = await prisma.report.update({
        where: { id: routeId(request.params.id) ?? "" },
        data: {
          status: parsed.data.status,
          reviewerNote: parsed.data.reviewerNote,
          reviewedAt: new Date(),
        },
      });

      response.status(200).json({ id: report.id, status: report.status });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

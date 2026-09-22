import { Router } from "express";
import type { Prisma, PrismaClient } from "@prisma/client";
import { boundsQuerySchema, type BuildingSummary } from "@ubc-access-map/shared";
import { badRequest } from "../errors.js";
import { toWashroomSummary } from "../lib/serialize.js";

const washroomInclude = {
  building: true,
  attributes: true,
  ratings: true,
} as const;

export function mapRouter(prisma: PrismaClient) {
  const router = Router();

  router.get("/api/map", async (request, response, next) => {
    try {
      const parsed = boundsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        throw badRequest("Invalid map filters.", parsed.error.flatten());
      }

      const query = parsed.data;
      const attributeFilters = [
        ["accessibleStall", query.accessibleStall],
        ["grabBars", query.grabBars],
        ["automaticDoor", query.automaticDoor],
        ["elevatorAccess", query.elevatorAccess],
        ["changingTable", query.changingTable],
      ] as const;

      const washroomWhere: Prisma.WashroomWhereInput = {
        building: {
          centroidLng: { gte: query.west, lte: query.east },
          centroidLat: { gte: query.south, lte: query.north },
          ...(query.stepFreeBuildingAccess
            ? { stepFreeAccess: query.stepFreeBuildingAccess }
            : {}),
          ...(query.q
            ? {
                OR: [
                  { name: { contains: query.q, mode: "insensitive" } },
                  { code: { contains: query.q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        ...(query.genderType ? { genderType: query.genderType } : {}),
        ...(query.rank ? { rankLetter: query.rank } : {}),
        AND: attributeFilters
          .filter(([, value]) => value)
          .map(([key, value]) => ({
            attributes: {
              some: { key, value: value! },
            },
          })),
      };

      const [buildings, washrooms] = await Promise.all([
        prisma.building.findMany({
          where: {
            centroidLng: { gte: query.west, lte: query.east },
            centroidLat: { gte: query.south, lte: query.north },
            ...(query.q
              ? {
                  OR: [
                    { name: { contains: query.q, mode: "insensitive" } },
                    { code: { contains: query.q, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          include: {
            washrooms: {
              select: { rankLetter: true },
            },
          },
        }),
        prisma.washroom.findMany({
          where: washroomWhere,
          include: washroomInclude,
        }),
      ]);

      const matchingBuildingIds = new Set(washrooms.map((washroom) => washroom.buildingId));
      const hasWashroomFilter =
        Boolean(query.rank) ||
        Boolean(query.genderType) ||
        attributeFilters.some(([, value]) => value) ||
        Boolean(query.stepFreeBuildingAccess);

      const visibleBuildings: BuildingSummary[] = buildings
        .filter((building) => !hasWashroomFilter || matchingBuildingIds.has(building.id))
        .map((building) => ({
          id: building.id,
          sourceId: building.sourceId,
          name: building.name,
          code: building.code,
          centroidLat: building.centroidLat,
          centroidLng: building.centroidLng,
          footprint: building.footprint,
          stepFreeAccess: building.stepFreeAccess,
          hours: building.hours,
          washroomCount: building.washrooms.length,
          bestRank: bestRank(building.washrooms.map((washroom) => washroom.rankLetter)),
        }));

      response.status(200).json({
        buildings: visibleBuildings,
        washrooms: washrooms.map(toWashroomSummary),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/search", async (request, response, next) => {
    try {
      const q = String(request.query.q ?? "").trim();
      if (q.length < 2) {
        response.status(200).json({ buildings: [], washrooms: [] });
        return;
      }

      const [buildings, washrooms] = await Promise.all([
        prisma.building.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 8,
          include: { washrooms: { select: { rankLetter: true } } },
        }),
        prisma.washroom.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { building: { name: { contains: q, mode: "insensitive" } } },
              { building: { code: { contains: q, mode: "insensitive" } } },
            ],
          },
          take: 8,
          include: washroomInclude,
        }),
      ]);

      response.status(200).json({
        buildings: buildings.map((building) => ({
          id: building.id,
          sourceId: building.sourceId,
          name: building.name,
          code: building.code,
          centroidLat: building.centroidLat,
          centroidLng: building.centroidLng,
          footprint: building.footprint,
          stepFreeAccess: building.stepFreeAccess,
          hours: building.hours,
          washroomCount: building.washrooms.length,
          bestRank: bestRank(building.washrooms.map((washroom) => washroom.rankLetter)),
        })),
        washrooms: washrooms.map(toWashroomSummary),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function bestRank(letters: Array<string | null>): BuildingSummary["bestRank"] {
  const order = ["S", "A", "B", "C", "D"] as const;
  for (const letter of order) {
    if (letters.includes(letter)) {
      return letter;
    }
  }
  return null;
}

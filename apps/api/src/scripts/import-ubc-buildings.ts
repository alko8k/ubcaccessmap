import "dotenv/config";
import type { Prisma } from "@prisma/client";
import { BUILDING_SOURCE_URL } from "@ubc-access-map/shared";
import { loadEnv } from "../env.js";
import { centroidOfGeometry } from "../lib/geo.js";
import { prisma } from "../prisma.js";

type BuildingFeature = {
  type: "Feature";
  properties: {
    BLDG_UID?: string;
    NAME?: string;
    BLDG_CODE?: string | null;
    BLDG_USAGE?: string | null;
    BLDG_STATE?: string | null;
    JURISDICTION?: string | null;
    MANAGE_ORG?: string | null;
  };
  geometry: {
    type: string;
    coordinates: unknown;
  } | null;
};

type BuildingCollection = {
  features: BuildingFeature[];
};

/*
 * Buildings a student can actually walk into.
 *
 * The published dataset covers everything on the peninsula, including the UNA
 * residential neighbourhoods (Wesbrook, Hampton, Chancellor, Hawthorn), the
 * separately governed institutions (TRIUMF, St. Mark's, Vancouver School of
 * Theology), and the residences run by Student Housing. None of those are
 * places to send someone looking for a washroom, so they never reach the map.
 */
const EXCLUDED_JURISDICTIONS = new Set(["UNA", "Non-UBC"]);
/** SHHS runs the student residences; Private/Non-UBC are leaseholders. */
const EXCLUDED_MANAGERS = new Set(["SHHS", "Private", "Non-UBC"]);
const EXCLUDED_USAGES = new Set(["Housing", "StudentHousing", "Operations"]);

/*
 * Buildings the published snapshot has not caught up with. The Gateway Health
 * Building (Kinesiology, Nursing, and the health clinics) is still flagged
 * Unoccupied with no occupancy date, but it is open and in use, so the state
 * check would otherwise keep it off the map. Remove an entry once the upstream
 * dataset marks it Occupied.
 */
const OPEN_DESPITE_STALE_STATE = new Set(["GWHB"]);

/*
 * Residence commonsblocks, admitted despite the SHHS rule.
 *
 * SHHS runs the residences, so its buildings are excluded wholesale. The
 * commonsblocks are the exception: they are the shared front-of-house at each
 * residence (front desk, dining, study space) rather than living quarters, and
 * are classed Services rather than StudentHousing. The classification alone is
 * too loose to key on — most SHHS "Services" buildings are licensed child care
 * centres, which are not walk-in space — so these are named explicitly.
 */
const RESIDENCE_COMMONSBLOCKS = new Set(["WGR1"]);

function isStudentAccessible(properties: BuildingFeature["properties"]): boolean {
  const staleButOpen = OPEN_DESPITE_STALE_STATE.has(properties.BLDG_CODE ?? "");
  if (!staleButOpen && properties.BLDG_STATE && properties.BLDG_STATE !== "Occupied") {
    return false;
  }
  if (EXCLUDED_JURISDICTIONS.has(properties.JURISDICTION ?? "")) {
    return false;
  }
  if (
    EXCLUDED_MANAGERS.has(properties.MANAGE_ORG ?? "") &&
    !RESIDENCE_COMMONSBLOCKS.has(properties.BLDG_CODE ?? "")
  ) {
    return false;
  }
  return !EXCLUDED_USAGES.has(properties.BLDG_USAGE ?? "");
}

/** ~0.1 m precision. The source carries far more, at a real cost in payload size. */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function simplifyPrecision(geometry: { type: string; coordinates: unknown }) {
  const walk = (value: unknown): unknown => {
    if (typeof value === "number") {
      return round(value);
    }
    return Array.isArray(value) ? value.map(walk) : value;
  };
  return { ...geometry, coordinates: walk(geometry.coordinates) };
}

async function importBuildings() {
  loadEnv();
  const response = await fetch(BUILDING_SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to download UBC buildings: ${response.status}`);
  }

  const collection = (await response.json()) as BuildingCollection;
  let upserted = 0;
  let reconciled = 0;
  const keptSourceIds = new Set<string>();

  for (const feature of collection.features) {
    const sourceId = feature.properties.BLDG_UID;
    const name = feature.properties.NAME;
    const geometry = feature.geometry;
    if (!sourceId || !name || !geometry) {
      continue;
    }

    if (!isStudentAccessible(feature.properties)) {
      continue;
    }

    const centroid = centroidOfGeometry(geometry);
    if (!centroid) {
      continue;
    }

    const code = feature.properties.BLDG_CODE ?? null;
    const shared = {
      name,
      centroidLat: round(centroid.lat),
      centroidLng: round(centroid.lng),
      footprint: simplifyPrecision(geometry) as Prisma.InputJsonValue,
      sourceUrl: BUILDING_SOURCE_URL,
      importedAt: new Date(),
    };

    /*
     * The seed creates its curated buildings before this import ever runs, and
     * it keys them by building code rather than BLDG_UID. Matching on code as
     * well as sourceId means an imported feature updates the curated row it
     * belongs to instead of creating a second, washroom-less copy of it.
     */
    const existing = await prisma.building.findFirst({
      where: code ? { OR: [{ sourceId }, { code }] } : { sourceId },
    });

    if (existing) {
      await prisma.building.update({
        where: { id: existing.id },
        data: { ...shared, sourceId, code: code ?? existing.code },
      });
      if (existing.sourceId !== sourceId) {
        reconciled += 1;
      }
    } else {
      await prisma.building.create({
        data: { ...shared, sourceId, code },
      });
    }
    keptSourceIds.add(sourceId);
    upserted += 1;
  }

  /*
   * Drop rows from earlier, unfiltered imports. Buildings that carry washrooms
   * are never touched: deleting one cascades to its ratings and reports, and no
   * classification change justifies destroying contributed data. Anything held
   * back this way is reported so it can be looked at by hand.
   */
  const stale = await prisma.building.findMany({
    where: { sourceId: { notIn: [...keptSourceIds] } },
    include: { _count: { select: { washrooms: true } } },
  });
  const removable = stale.filter((building) => building._count.washrooms === 0);
  const kept = stale.filter((building) => building._count.washrooms > 0);

  if (removable.length > 0) {
    await prisma.building.deleteMany({
      where: { id: { in: removable.map((building) => building.id) } },
    });
  }

  console.log(`Removed ${removable.length} buildings that are not student-accessible.`);
  if (kept.length > 0) {
    console.warn(
      `Kept ${kept.length} excluded building(s) that still hold washroom data: ${kept
        .map((building) => building.code ?? building.name)
        .join(", ")}`,
    );
  }

  await prisma.dataImport.create({
    data: {
      sourceUrl: BUILDING_SOURCE_URL,
      featureCount: upserted,
    },
  });

  console.log(
    `Imported or updated ${upserted} UBC buildings (${reconciled} matched existing curated rows by code).`,
  );
}

importBuildings()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import "dotenv/config";
import { PrismaClient, type FactState, type GenderType, type Prisma } from "@prisma/client";
import { ACCESSIBILITY_KEYS, BUILDING_SOURCE_URL } from "@ubc-access-map/shared";
import { centroidOfGeometry, rectangleFootprint } from "../src/lib/geo.js";

const prisma = new PrismaClient();

type Footprint = { type: string; coordinates: unknown };

/**
 * Real UBC footprints, keyed by building code.
 *
 * The seed used to draw every building as its bounding rectangle, which is why
 * the map showed boxes. We pull the published outlines instead and fall back to
 * the rectangle only when the download is unavailable (e.g. seeding offline).
 */
async function loadFootprints(): Promise<Map<string, Footprint>> {
  const byCode = new Map<string, Footprint>();
  try {
    const response = await fetch(BUILDING_SOURCE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const collection = (await response.json()) as {
      features: Array<{
        properties: { BLDG_CODE?: string | null };
        geometry: Footprint | null;
      }>;
    };
    for (const feature of collection.features) {
      const code = feature.properties.BLDG_CODE;
      if (code && feature.geometry) {
        byCode.set(code, feature.geometry);
      }
    }
  } catch (error) {
    console.warn(
      `Could not download UBC building footprints (${String(error)}). Falling back to rectangles.`,
    );
  }
  return byCode;
}

type AttributeSeed = {
  key: (typeof ACCESSIBILITY_KEYS)[number];
  value: FactState;
  source: string;
  confidence: "low" | "medium" | "high";
  lastVerifiedAt: Date;
};

type WashroomSeed = {
  name: string;
  floor: string;
  directions: string;
  genderType: GenderType;
  hours?: string;
  attributes: AttributeSeed[];
};

type BuildingSeed = {
  sourceId: string;
  name: string;
  code: string;
  west: number;
  south: number;
  east: number;
  north: number;
  stepFreeAccess: FactState;
  hours: string;
  washrooms: WashroomSeed[];
};

const verified = new Date("2026-03-01T00:00:00.000Z");

function facts(
  values: Partial<Record<(typeof ACCESSIBILITY_KEYS)[number], FactState>>,
  source: string,
): AttributeSeed[] {
  return ACCESSIBILITY_KEYS.map((key) => ({
    key,
    value: values[key] ?? "unknown",
    source,
    confidence: values[key] ? "medium" : "low",
    lastVerifiedAt: verified,
  }));
}

const buildings: BuildingSeed[] = [
  {
    sourceId: "seed-IBLC",
    name: "Irving K. Barber Learning Centre",
    code: "IBLC",
    west: -123.253407,
    south: 49.266997,
    east: -123.25201,
    north: 49.268216,
    stepFreeAccess: "yes",
    hours: "Building hours vary; library floors often open late during term.",
    washrooms: [
      {
        name: "Level 3 all-gender, near Dodson Room",
        floor: "3",
        directions: "From the main atrium stairs or elevator, turn left past the Dodson Room. Door is on the south wall.",
        genderType: "all_gender",
        hours: "Library hours",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            transferSpace: "yes",
            accessibleSink: "yes",
            automaticDoor: "yes",
            elevatorAccess: "yes",
            changingTable: "no",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
      {
        name: "Level 2 multi-stall",
        floor: "2",
        directions: "Enter from the Main Mall doors, stay on level 2, and follow signs past the circulation desk.",
        genderType: "womens",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            transferSpace: "unknown",
            accessibleSink: "yes",
            automaticDoor: "no",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-NEST",
    name: "AMS Student Nest",
    code: "NEST",
    west: -123.250522,
    south: 49.266059,
    east: -123.249063,
    north: 49.267114,
    stepFreeAccess: "yes",
    hours: "Generally 7:00–midnight during term; food court hours vary.",
    washrooms: [
      {
        name: "Level 2 accessible / all-gender",
        floor: "2",
        directions: "From University Boulevard, take the central elevator to level 2. The washroom is across from the AMS offices.",
        genderType: "all_gender",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            transferSpace: "yes",
            accessibleSink: "yes",
            automaticDoor: "yes",
            elevatorAccess: "yes",
            changingTable: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
      {
        name: "Lower food court stalls",
        floor: "1",
        directions: "Enter the food court and follow the corridor toward the loading/back-of-house hallway.",
        genderType: "mens",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "no",
            grabBars: "no",
            automaticDoor: "no",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-LIFE",
    name: "UBC Life Building",
    code: "LIFE",
    west: -123.250881,
    south: 49.266939,
    east: -123.249243,
    north: 49.267929,
    stepFreeAccess: "yes",
    hours: "Typically 7:00–23:00 during term.",
    washrooms: [
      {
        name: "Main floor all-gender",
        floor: "1",
        directions: "Come in from the Life Building / Nest connector and stay on the main floor. Door is past the lounge seating.",
        genderType: "all_gender",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            transferSpace: "unknown",
            accessibleSink: "yes",
            automaticDoor: "yes",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-KLIB",
    name: "Walter C. Koerner Library",
    code: "KLIB",
    west: -123.25545,
    south: 49.266338,
    east: -123.254785,
    north: 49.266957,
    stepFreeAccess: "yes",
    hours: "Library hours; often late during exams.",
    washrooms: [
      {
        name: "Level 2 stacks washroom",
        floor: "2",
        directions: "Take the elevator from the Main Mall entrance to level 2 and follow the stacks corridor south.",
        genderType: "womens",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            accessibleSink: "unknown",
            automaticDoor: "no",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-BUCH",
    name: "Buchanan Building",
    code: "BUCH",
    west: -123.255316,
    south: 49.267976,
    east: -123.253476,
    north: 49.269504,
    stepFreeAccess: "unknown",
    hours: "Classroom hours; some wings lock in the evening.",
    washrooms: [
      {
        name: "Buchanan A, floor 1",
        floor: "1",
        directions: "Enter Buchanan A from Main Mall. The washroom is down the first hallway on the right, before the lecture theatres.",
        genderType: "mens",
        attributes: facts(
          {
            stepFreeBuildingAccess: "unknown",
            accessibleStall: "unknown",
            grabBars: "unknown",
            elevatorAccess: "yes",
          },
          "Unverified directory placeholder",
        ),
      },
      {
        name: "Buchanan D, floor 2 all-gender",
        floor: "2",
        directions: "Use the courtyard elevator to Buchanan D level 2. Look for the single-occupancy door near the north stair.",
        genderType: "private",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            transferSpace: "yes",
            accessibleSink: "yes",
            automaticDoor: "no",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-KAIS",
    name: "Fred Kaiser Building",
    code: "KAIS",
    west: -123.250575,
    south: 49.261962,
    east: -123.249603,
    north: 49.262767,
    stepFreeAccess: "yes",
    hours: "Typically weekday daytime plus evening labs.",
    washrooms: [
      {
        name: "KAIS 1st floor, near atrium",
        floor: "1",
        directions: "Enter from the Engineering Student Centre plaza. The washroom is behind the atrium stairs, left of the elevators.",
        genderType: "all_gender",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            transferSpace: "yes",
            accessibleSink: "yes",
            automaticDoor: "yes",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-ICCS",
    name: "ICICS / Computer Science Building",
    code: "ICCS",
    west: -123.249446,
    south: 49.260753,
    east: -123.248187,
    north: 49.261578,
    stepFreeAccess: "yes",
    hours: "Card access after hours for CS students.",
    washrooms: [
      {
        name: "X-wing level 2",
        floor: "2",
        directions: "From the Reboot Cafe entrance, take the elevator to level 2 and follow the X-wing corridor.",
        genderType: "womens",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "unknown",
            automaticDoor: "no",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-ANGU",
    name: "Henry Angus Building",
    code: "ANGU",
    west: -123.254445,
    south: 49.26466,
    east: -123.253295,
    north: 49.265576,
    stepFreeAccess: "yes",
    hours: "Sauder hours; quieter after 18:00.",
    washrooms: [
      {
        name: "Angus main floor",
        floor: "1",
        directions: "Enter from University Boulevard. Walk past the Sauder welcome desk; washrooms are on the east corridor.",
        genderType: "mens",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            accessibleSink: "yes",
            automaticDoor: "yes",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-AQUA",
    name: "UBC Aquatic Centre",
    code: "AQUA",
    west: -123.249361,
    south: 49.267293,
    east: -123.247833,
    north: 49.268264,
    stepFreeAccess: "yes",
    hours: "Recreation facility hours; membership or drop-in may be required for some areas.",
    washrooms: [
      {
        name: "Lobby change-room washroom",
        floor: "1",
        directions: "From the Thunderbird Boulevard entrance, the public washroom is in the lobby before the paid recreation gate.",
        genderType: "all_gender",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            transferSpace: "yes",
            accessibleSink: "yes",
            automaticDoor: "yes",
            elevatorAccess: "yes",
            changingTable: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-CIRS",
    name: "CIRS",
    code: "CIRS",
    west: -123.253387,
    south: 49.261787,
    east: -123.252711,
    north: 49.262305,
    stepFreeAccess: "yes",
    hours: "Weekday building hours.",
    washrooms: [
      {
        name: "CIRS ground floor",
        floor: "1",
        directions: "Enter from the courtyard. The washroom is behind the main stair, clearly signed.",
        genderType: "all_gender",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            accessibleSink: "yes",
            automaticDoor: "yes",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-ESB",
    name: "Earth Sciences Building",
    code: "ESB",
    west: -123.252895,
    south: 49.262645,
    east: -123.251619,
    north: 49.263435,
    stepFreeAccess: "yes",
    hours: "Typically weekday daytime.",
    washrooms: [
      {
        name: "ESB level 1",
        floor: "1",
        directions: "From Main Mall, enter the glass lobby and turn right before the lecture theatre.",
        genderType: "womens",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            automaticDoor: "no",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-BETY",
    name: "Beaty Biodiversity Centre",
    code: "BETY",
    west: -123.251198,
    south: 49.262889,
    east: -123.24963,
    north: 49.263938,
    stepFreeAccess: "yes",
    hours: "Museum hours for public areas.",
    washrooms: [
      {
        name: "Museum lobby",
        floor: "1",
        directions: "The washroom is in the museum lobby, before ticketed galleries, on the west side.",
        genderType: "all_gender",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            transferSpace: "yes",
            accessibleSink: "yes",
            automaticDoor: "yes",
            elevatorAccess: "yes",
            changingTable: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-FSC",
    name: "Forest Sciences Centre",
    code: "FSC",
    west: -123.24892,
    south: 49.260069,
    east: -123.246642,
    north: 49.261191,
    stepFreeAccess: "unknown",
    hours: "Weekday building hours.",
    washrooms: [
      {
        name: "FSC atrium",
        floor: "1",
        directions: "Enter the atrium from Main Mall. Washrooms are signed on the south side of the lobby.",
        genderType: "mens",
        attributes: facts(
          {
            stepFreeBuildingAccess: "unknown",
            accessibleStall: "yes",
            grabBars: "unknown",
            elevatorAccess: "yes",
          },
          "Unverified directory placeholder",
        ),
      },
    ],
  },
  {
    sourceId: "seed-CHEM",
    name: "Chemistry Building",
    code: "CHEM",
    west: -123.253445,
    south: 49.265185,
    east: -123.25188,
    north: 49.266507,
    stepFreeAccess: "unknown",
    hours: "Lab buildings may lock after hours.",
    washrooms: [
      {
        name: "Chemistry D, floor 2",
        floor: "2",
        directions: "Use the elevator in the D wing. The washroom is opposite the second-floor lab corridor.",
        genderType: "womens",
        attributes: facts(
          {
            stepFreeBuildingAccess: "unknown",
            accessibleStall: "unknown",
            elevatorAccess: "yes",
          },
          "Unverified directory placeholder",
        ),
      },
    ],
  },
  {
    sourceId: "seed-IRC",
    name: "Woodward IRC",
    code: "IRC",
    west: -123.247422,
    south: 49.26446,
    east: -123.246238,
    north: 49.265156,
    stepFreeAccess: "yes",
    hours: "Health-campus hours; often quiet in evenings.",
    washrooms: [
      {
        name: "IRC lecture-level",
        floor: "1",
        directions: "From Wesbrook Mall, enter the lecture theatre lobby. Washrooms are to the left of the ticket/info alcove.",
        genderType: "all_gender",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            accessibleSink: "yes",
            automaticDoor: "yes",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
  {
    sourceId: "seed-LSK",
    name: "Leonard S. Klinck Building",
    code: "LSK",
    west: -123.255908,
    south: 49.265178,
    east: -123.254788,
    north: 49.265745,
    stepFreeAccess: "unknown",
    hours: "Weekday classroom hours.",
    washrooms: [
      {
        name: "LSK floor 1",
        floor: "1",
        directions: "Enter from West Mall. The washroom is at the end of the first classroom hallway.",
        genderType: "mens",
        attributes: facts(
          {
            stepFreeBuildingAccess: "unknown",
            accessibleStall: "no",
            grabBars: "no",
            elevatorAccess: "yes",
          },
          "Unverified directory placeholder",
        ),
      },
    ],
  },
  {
    sourceId: "seed-MCLD",
    name: "Hector J. MacLeod Building",
    code: "MCLD",
    west: -123.249854,
    south: 49.261434,
    east: -123.248836,
    north: 49.262055,
    stepFreeAccess: "yes",
    hours: "Engineering building hours.",
    washrooms: [
      {
        name: "MacLeod floor 2",
        floor: "2",
        directions: "From the Kaiser connector, stay on level 2. The washroom is beside the student lounge.",
        genderType: "womens",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            automaticDoor: "no",
            elevatorAccess: "yes",
          },
          "Curated campus walkthrough, March 2026",
        ),
      },
    ],
  },
{
    sourceId: "seed-SHRM",
    name: "Gordon B. Shrum Building",
    code: "SHRM",
    west: -123.247882,
    south: 49.265365,
    east: -123.246771,
    north: 49.265898,
    stepFreeAccess: "unknown",
    hours: "Building hours not recorded.",
    washrooms: [
      {
        name: "Basement all-gender stalls",
        floor: "B",
        directions:
          "In the basement. Individual all-gender stalls, each with its own sink inside the stall.",
        genderType: "all_gender",
        attributes: facts(
          {
            // Only what the report actually establishes. Everything else stays
            // unknown rather than being inferred from a self-contained stall.
          },
          "Community report, September 2026 — not yet verified on site",
        ),
      },
    ],
  },
{
    sourceId: "seed-GWHB",
    name: "Gateway Health Building",
    code: "GWHB",
    west: -123.247088,
    south: 49.266327,
    east: -123.24592,
    north: 49.267174,
    stepFreeAccess: "yes",
    hours: "Building hours not recorded.",
    washrooms: [
      {
        name: "Main floor all-gender stalls",
        floor: "1",
        directions:
          "On the main floor. Individual all-gender stalls, each with its own sink inside the stall, and towels provided.",
        genderType: "all_gender",
        attributes: facts(
          {
            stepFreeBuildingAccess: "yes",
            accessibleStall: "yes",
            grabBars: "yes",
            transferSpace: "yes",
            accessibleSink: "yes",
            automaticDoor: "yes",
            // Entry level, so no elevator serves it. changingTable stays unknown:
            // a change table is an amenity, not an accessibility feature.
            elevatorAccess: "no",
          },
          "Community report, September 2026 — not yet verified on site",
        ),
      },
      {
        name: "Basement all-gender stalls",
        floor: "B",
        directions:
          "In the basement. Similar all-gender stalls with sinks inside the stall. The reporter believed this one is less accessible than the main floor washroom but was not certain, so no accessibility facts are recorded for it.",
        genderType: "all_gender",
        attributes: facts(
          {
            // Reported as "not as accessible, I think". An uncertain negative is
            // still not a fact: recording "no" would be as wrong as recording
            // "yes", so every field stays unknown until someone checks.
          },
          "Community report, September 2026 — unverified, accessibility not assessed",
        ),
      },
    ],
  },
{
    sourceId: "seed-WGR1",
    name: "Walter H. Gage Residence - Commonsblock",
    code: "WGR1",
    west: -123.250322,
    south: 49.269269,
    east: -123.249334,
    north: 49.269808,
    stepFreeAccess: "yes",
    hours: "Building hours not recorded.",
    washrooms: [
      {
        name: "Lobby accessible washroom 1",
        floor: "1",
        directions:
          "One of two designated accessible washrooms off the Commonsblock lobby, separate from the men's and women's rooms.",
        genderType: "all_gender",
        attributes: facts(
          {
            // Reported as a designated accessible washroom. That establishes the
            // stall itself; grab bars, transfer space, sink height and door type
            // were not reported and stay unknown.
            accessibleStall: "yes",
            stepFreeBuildingAccess: "yes",
            // Entry level, so no elevator serves it.
            elevatorAccess: "no",
          },
          "Community report, September 2026 — not yet verified on site",
        ),
      },
      {
        name: "Lobby accessible washroom 2",
        floor: "1",
        directions:
          "The second of two designated accessible washrooms off the Commonsblock lobby.",
        genderType: "all_gender",
        attributes: facts(
          {
            accessibleStall: "yes",
            stepFreeBuildingAccess: "yes",
            // Entry level, so no elevator serves it.
            elevatorAccess: "no",
          },
          "Community report, September 2026 — not yet verified on site",
        ),
      },
      {
        name: "Lobby men's washroom",
        floor: "1",
        directions:
          "Men's washroom in the Commonsblock lobby area. Reported as having an accessible stall.",
        genderType: "mens",
        attributes: facts(
          {
            accessibleStall: "yes",
            stepFreeBuildingAccess: "yes",
            // Entry level, so no elevator serves it.
            elevatorAccess: "no",
          },
          "Community report, September 2026 — not yet verified on site",
        ),
      },
      {
        name: "Lobby women's washroom",
        floor: "1",
        directions:
          "Women's washroom in the Commonsblock lobby area. Reported as having an accessible stall.",
        genderType: "womens",
        attributes: facts(
          {
            accessibleStall: "yes",
            stepFreeBuildingAccess: "yes",
            // Entry level, so no elevator serves it.
            elevatorAccess: "no",
          },
          "Community report, September 2026 — not yet verified on site",
        ),
      },
    ],
  },
];

async function seed() {
  const footprints = await loadFootprints();
  let realFootprints = 0;

  for (const building of buildings) {
    const real = footprints.get(building.code);
    const footprint = (real ??
      rectangleFootprint(
        building.west,
        building.south,
        building.east,
        building.north,
      )) as Prisma.InputJsonValue;
    const centroid = real ? centroidOfGeometry(real) : null;
    const centroidLat = centroid?.lat ?? (building.south + building.north) / 2;
    const centroidLng = centroid?.lng ?? (building.west + building.east) / 2;
    if (real) {
      realFootprints += 1;
    }

    const shared = {
      name: building.name,
      code: building.code,
      centroidLat,
      centroidLng,
      footprint,
      sourceUrl: BUILDING_SOURCE_URL,
      stepFreeAccess: building.stepFreeAccess,
      hours: building.hours,
    };

    /*
     * The buildings import may already have created this row under its real
     * BLDG_UID. Matching on code as well as sourceId keeps the curated seed and
     * the imported footprint on one building instead of two copies of it.
     */
    const existing = await prisma.building.findFirst({
      where: { OR: [{ sourceId: building.sourceId }, { code: building.code }] },
    });

    const saved = existing
      ? await prisma.building.update({ where: { id: existing.id }, data: shared })
      : await prisma.building.create({
          data: { ...shared, sourceId: building.sourceId },
        });

    for (const washroom of building.washrooms) {
      const existing = await prisma.washroom.findFirst({
        where: { buildingId: saved.id, name: washroom.name },
      });

      const savedWashroom = existing
        ? await prisma.washroom.update({
            where: { id: existing.id },
            data: {
              floor: washroom.floor,
              directions: washroom.directions,
              genderType: washroom.genderType,
              hours: washroom.hours,
            },
          })
        : await prisma.washroom.create({
            data: {
              buildingId: saved.id,
              name: washroom.name,
              floor: washroom.floor,
              directions: washroom.directions,
              genderType: washroom.genderType,
              hours: washroom.hours,
            },
          });

      for (const attribute of washroom.attributes) {
        await prisma.washroomAttribute.upsert({
          where: {
            washroomId_key: {
              washroomId: savedWashroom.id,
              key: attribute.key,
            },
          },
          update: attribute,
          create: {
            washroomId: savedWashroom.id,
            ...attribute,
          },
        });
      }
    }
  }

  console.log(
    `Seeded ${buildings.length} buildings (${realFootprints} with real UBC footprints) and their curated washrooms.`,
  );
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

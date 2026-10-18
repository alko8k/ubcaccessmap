import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { UBC_CAMPUS, type BuildingSummary, type WashroomSummary } from "@ubc-access-map/shared";
import { RANK_COLORS, RANK_INK, UNRANKED_COLOR } from "../../lib/ranks.ts";
import { NARROW_QUERY, prefersReducedMotion } from "../../lib/useMediaQuery.ts";
import { MAP_HALO, campusStyle } from "./mapStyle.ts";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = {
  buildings: BuildingSummary[];
  washrooms: WashroomSummary[];
  selectedWashroomId?: string;
  selectedBuildingId?: string;
  onSelectWashroom: (id: string) => void;
  onSelectBuilding: (id: string) => void;
  /** The building to highlight, from either a hovered list row or the map. */
  hoveredBuildingId: string | null;
  onHoverBuilding: (id: string | null) => void;
  /** When set, the camera fits the matching buildings. */
  searchQuery: string;
  /** Called with a readable reason when the browser can't provide a position. */
  onLocateError: (message: string) => void;
};

/**
 * Paint a colour straight off a feature's `rank` property.
 *
 * Buildings, badges, and washroom dots all read from this, so a tier looks the
 * same wherever it appears. The blue accent stays on the interface chrome only.
 */
const rankMatch: unknown[] = [
  "match",
  ["get", "rank"],
  "S", RANK_COLORS.S,
  "A", RANK_COLORS.A,
  "B", RANK_COLORS.B,
  "C", RANK_COLORS.C,
  "D", RANK_COLORS.D,
  UNRANKED_COLOR,
];

/** Ranked buildings get a lettered badge; unranked ones a smaller hollow ring. */
const RANKED: unknown[] = ["!=", ["get", "rank"], ""];
const UNRANKED: unknown[] = ["==", ["get", "rank"], ""];
const BADGE_LAYERS: Array<[string, unknown[]]> = [
  ["building-badge-glow", RANKED],
  ["building-badge", RANKED],
  ["building-badge-letter", RANKED],
  ["building-badge-unranked", UNRANKED],
];

const hovered = ["boolean", ["feature-state", "hover"], false] as never;

/** Exponential ease-out: quick to respond, gentle to settle. */
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Padding that keeps a camera target inside the part of the map the floating
 * cards don't cover. Measured from the DOM, so it follows the real layout.
 */
function visiblePadding(container: HTMLElement) {
  const box = container.getBoundingClientRect();
  const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
  const margin = 24;

  if (window.matchMedia?.(NARROW_QUERY).matches) {
    const top = (rect(".explore-top")?.bottom ?? box.top) - box.top + margin;
    const cover = rect(".detail-card") ?? rect(".sheet");
    const bottom = cover ? box.bottom - cover.top + margin : margin;
    // Leave at least a sliver of map to aim at, even under a tall sheet.
    return { top, bottom: Math.min(bottom, box.height - top - 80), left: margin, right: margin };
  }

  const explore = rect(".explore");
  const detail = rect(".detail-card");
  return {
    top: margin,
    bottom: margin,
    left: explore ? explore.right - box.left + margin : margin,
    right: detail ? box.right - detail.left + margin : margin,
  };
}

export function CampusMap({
  buildings,
  washrooms,
  selectedWashroomId,
  selectedBuildingId,
  onSelectWashroom,
  onSelectBuilding,
  hoveredBuildingId,
  onHoverBuilding,
  searchQuery,
  onLocateError,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelectWashroom);
  const onSelectBuildingRef = useRef(onSelectBuilding);
  const onLocateErrorRef = useRef(onLocateError);
  const onHoverRef = useRef(onHoverBuilding);
  const hoverStateRef = useRef<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelectWashroom;
  }, [onSelectWashroom]);

  useEffect(() => {
    onSelectBuildingRef.current = onSelectBuilding;
  }, [onSelectBuilding]);

  useEffect(() => {
    onLocateErrorRef.current = onLocateError;
  }, [onLocateError]);

  useEffect(() => {
    onHoverRef.current = onHoverBuilding;
  }, [onHoverBuilding]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: campusStyle,
      center: [UBC_CAMPUS.center.lng, UBC_CAMPUS.center.lat],
      zoom: UBC_CAMPUS.defaultZoom,
      maxBounds: [
        [UBC_CAMPUS.bounds.west - 0.02, UBC_CAMPUS.bounds.south - 0.02],
        [UBC_CAMPUS.bounds.east + 0.02, UBC_CAMPUS.bounds.north + 0.02],
      ],
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // The one locate button: it also draws the position dot on the map.
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, timeout: 10000 },
      trackUserLocation: false,
    });
    geolocate.on("error", (error: GeolocationPositionError) => {
      onLocateErrorRef.current(
        error.code === error.PERMISSION_DENIED
          ? "Location access is off. Allow it in your browser settings, or search for a building instead."
          : "Couldn't find your location. Try again, or search for a building instead.",
      );
    });
    geolocate.on("outofmaxbounds", () => {
      onLocateErrorRef.current("You're outside the campus map, so there's nothing to show nearby.");
    });
    map.addControl(geolocate, "top-right");

    map.on("error", (event) => {
      console.error("[map]", event.error?.message ?? event);
    });

    map.on("load", () => {
      map.addSource("buildings", {
        type: "geojson",
        data: emptyCollection(),
        promoteId: "id",
      });
      map.addSource("washrooms", {
        type: "geojson",
        data: emptyCollection(),
      });
      map.addSource("badges", {
        type: "geojson",
        data: emptyCollection(),
      });

      map.addLayer({
        id: "building-fill",
        type: "fill",
        source: "buildings",
        paint: {
          "fill-color": rankMatch as never,
          "fill-opacity": [
            "case",
            ["==", ["get", "selected"], 1],
            0.45,
            hovered,
            0.4,
            ["==", ["get", "mapped"], 1],
            0.28,
            0.14,
          ],
        },
      });
      map.addLayer({
        id: "building-line",
        type: "line",
        source: "buildings",
        paint: {
          // Outline carries the rating, so a building's tier reads from its
          // own edge without having to find the badge.
          "line-color": rankMatch as never,
          // Every campus building gets a full-strength edge (3:1 against the
          // ground) so it stands apart from the quieter basemap buildings.
          "line-width": [
            "case",
            ["==", ["get", "selected"], 1],
            3,
            hovered,
            3,
            ["==", ["get", "mapped"], 1],
            2,
            1.5,
          ],
          "line-opacity": ["case", ["==", ["get", "selected"], 1], 1, 0.95],
        },
      });
      // Tier badge: a coloured medal sitting on each building.
      map.addLayer({
        id: "building-badge-glow",
        type: "circle",
        source: "badges",
        filter: RANKED as never,
        paint: {
          "circle-radius": ["case", ["==", ["get", "selected"], 1], 22, 16],
          "circle-color": rankMatch as never,
          "circle-opacity": ["case", ["==", ["get", "selected"], 1], 0.35, 0.16],
          "circle-blur": 0.6,
        },
      });
      map.addLayer({
        id: "building-badge",
        type: "circle",
        source: "badges",
        filter: RANKED as never,
        paint: {
          "circle-radius": ["case", ["==", ["get", "selected"], 1], 15, 12],
          "circle-color": rankMatch as never,
          "circle-stroke-width": 2,
          "circle-stroke-color": MAP_HALO,
        },
      });
      map.addLayer({
        id: "building-badge-letter",
        type: "symbol",
        source: "badges",
        filter: RANKED as never,
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Bold"],
          "text-size": ["case", ["==", ["get", "selected"], 1], 15, 13],
          "text-allow-overlap": true,
        },
        paint: { "text-color": RANK_INK },
      });
      // Shape, not just colour, says "no rank yet": a small hollow ring with no
      // letter, so the few ranked buildings are what stands out.
      map.addLayer({
        id: "building-badge-unranked",
        type: "circle",
        source: "badges",
        filter: UNRANKED as never,
        paint: {
          "circle-radius": ["case", ["==", ["get", "selected"], 1], 9, 7],
          "circle-color": MAP_HALO,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": UNRANKED_COLOR,
        },
      });

      // Individual washrooms only appear once a building is opened.
      map.addLayer({
        id: "washroom-dots",
        type: "circle",
        source: "washrooms",
        paint: {
          "circle-radius": ["case", ["==", ["get", "selected"], 1], 8, 6],
          "circle-color": rankMatch as never,
          "circle-stroke-width": 2,
          "circle-stroke-color": MAP_HALO,
        },
      });
    });

    for (const layer of ["building-badge", "building-badge-letter", "building-badge-unranked"]) {
      map.on("click", layer, (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") {
          onSelectBuildingRef.current(id);
        }
      });
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    map.on("click", "building-fill", (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") {
        onSelectBuildingRef.current(id);
      }
    });

    map.on("mousemove", "building-fill", (event) => {
      map.getCanvas().style.cursor = "pointer";
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string" && id !== hoverStateRef.current) {
        onHoverRef.current(id);
      }
    });
    map.on("mouseleave", "building-fill", () => {
      map.getCanvas().style.cursor = "";
      onHoverRef.current(null);
    });

    map.on("click", "washroom-dots", (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") {
        onSelectRef.current(id);
      }
    });

    map.on("mouseenter", "washroom-dots", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "washroom-dots", () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource("buildings")) {
      const handleLoad = () =>
        updateSources(mapRef.current, buildings, washrooms, selectedWashroomId, selectedBuildingId);
      map?.once("load", handleLoad);
      return;
    }

    updateSources(map, buildings, washrooms, selectedWashroomId, selectedBuildingId);

    // The opened building shows its washroom dots instead of its badge.
    for (const [layer, base] of BADGE_LAYERS) {
      if (map.getLayer(layer)) {
        map.setFilter(
          layer,
          (selectedBuildingId
            ? ["all", base, ["!=", ["get", "id"], selectedBuildingId]]
            : base) as never,
        );
      }
    }
  }, [buildings, washrooms, selectedWashroomId, selectedBuildingId]);

  // Mirror the shared hover state onto the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource("buildings")) {
      return;
    }
    const previous = hoverStateRef.current;
    if (previous && previous !== hoveredBuildingId) {
      map.setFeatureState({ source: "buildings", id: previous }, { hover: false });
    }
    if (hoveredBuildingId) {
      map.setFeatureState({ source: "buildings", id: hoveredBuildingId }, { hover: true });
    }
    hoverStateRef.current = hoveredBuildingId;
  }, [hoveredBuildingId, buildings]);

  const dataReady = buildings.length > 0;

  /*
   * The focal motion: whatever is selected, from the list or the map, glides
   * into the visible part of the map. Reduced motion jumps instead.
   */
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || (!selectedBuildingId && !selectedWashroomId)) {
      return;
    }

    let center: [number, number] | null = null;
    let zoom = 16.5;
    const washroom = washrooms.find((item) => item.id === selectedWashroomId);
    if (washroom) {
      const siblings = washrooms.filter((item) => item.buildingId === washroom.buildingId);
      center = spread(washroom, siblings);
      zoom = 17.5;
    } else {
      const building = buildings.find((item) => item.id === selectedBuildingId);
      if (building) {
        center = [building.centroidLng, building.centroidLat];
      }
    }
    if (!center) {
      return;
    }

    const camera = {
      center,
      zoom: Math.max(map.getZoom(), zoom),
      padding: visiblePadding(container),
    };
    if (prefersReducedMotion()) {
      map.jumpTo(camera);
    } else {
      map.easeTo({ ...camera, duration: 650, easing: easeOutExpo, essential: true });
    }
    // Move on a change of selection, or once data first arrives for a
    // selection that came in with the URL; not on every data refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuildingId, selectedWashroomId, dataReady]);

  // Searching brings the matching buildings into view.
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    const query = searchQuery.trim();
    if (!map || !container || !query || buildings.length === 0 || selectedBuildingId) {
      return;
    }

    const timer = window.setTimeout(() => {
      const bounds = new maplibregl.LngLatBounds();
      for (const building of buildings) {
        bounds.extend([building.centroidLng, building.centroidLat]);
      }
      map.fitBounds(bounds, {
        padding: visiblePadding(container),
        maxZoom: 17,
        duration: prefersReducedMotion() ? 0 : 650,
        easing: easeOutExpo,
        essential: true,
      });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, buildings]);

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-canvas" role="application" aria-label="UBC Vancouver campus map" />
    </div>
  );
}

type Geometry = {
  type: string;
  coordinates: unknown;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, string | number>;
    geometry: Geometry;
  }>;
};

function emptyCollection(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function updateSources(
  map: MapLibreMap | null,
  buildings: BuildingSummary[],
  washrooms: WashroomSummary[],
  selectedWashroomId?: string,
  selectedBuildingId?: string,
) {
  if (!map) return;
  const buildingSource = map.getSource("buildings") as GeoJSONSource | undefined;
  const washroomSource = map.getSource("washrooms") as GeoJSONSource | undefined;
  const badgeSource = map.getSource("badges") as GeoJSONSource | undefined;
  if (!buildingSource || !washroomSource || !badgeSource) return;

  buildingSource.setData({
    type: "FeatureCollection",
    features: buildings.flatMap((building) => {
      const geometry = building.footprint as Geometry | null;
      if (!geometry || !("type" in geometry)) {
        return [];
      }
      return [
        {
          type: "Feature" as const,
          properties: {
            id: building.id,
            name: building.name,
            rank: building.bestRank ?? "",
            mapped: building.washroomCount > 0 ? 1 : 0,
            selected: building.id === selectedBuildingId ? 1 : 0,
          },
          geometry,
        },
      ];
    }),
  });

  // One badge per building, carrying its best rank.
  badgeSource.setData({
    type: "FeatureCollection",
    features: buildings
      .filter((building) => building.washroomCount > 0)
      .map((building) => ({
        type: "Feature" as const,
        properties: {
          id: building.id,
          rank: building.bestRank ?? "",
          label: building.bestRank ?? "?",
          selected: building.id === selectedBuildingId ? 1 : 0,
        },
        geometry: {
          type: "Point",
          coordinates: [building.centroidLng, building.centroidLat],
        },
      })),
  });

  // Washroom dots are the opened-building view, so everything else stays clean.
  const openWashrooms = selectedBuildingId
    ? washrooms.filter((washroom) => washroom.buildingId === selectedBuildingId)
    : [];

  washroomSource.setData({
    type: "FeatureCollection",
    features: openWashrooms.map((washroom) => ({
      type: "Feature" as const,
      properties: {
        id: washroom.id,
        rank: washroom.rankLetter ?? "",
        selected: washroom.id === selectedWashroomId ? 1 : 0,
      },
      geometry: {
        type: "Point",
        coordinates: spread(washroom, openWashrooms),
      },
    })),
  });
}

/**
 * Washrooms in one building often share a coordinate, so identical points are
 * fanned out around it. The offset is derived from the washroom's rank within
 * its own cluster rather than its index in the whole list, which previously
 * dragged later markers steadily off their real location.
 */
function spread(washroom: WashroomSummary, all: WashroomSummary[]): [number, number] {
  const key = (item: WashroomSummary) => `${item.longitude},${item.latitude}`;
  const cluster = all.filter((item) => key(item) === key(washroom));
  if (cluster.length < 2) {
    return [washroom.longitude, washroom.latitude];
  }

  const position = cluster.findIndex((item) => item.id === washroom.id);
  const angle = (position / cluster.length) * Math.PI * 2;
  const radius = 0.00006;
  return [
    washroom.longitude + Math.cos(angle) * radius,
    washroom.latitude + Math.sin(angle) * radius * 0.65,
  ];
}

import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { UBC_CAMPUS, type BuildingSummary, type WashroomSummary } from "@ubc-access-map/shared";
import { RANK_COLORS, UNRANKED_COLOR } from "../../lib/ranks.ts";
import { MAP_INK, darkCampusStyle } from "./mapStyle.ts";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = {
  buildings: BuildingSummary[];
  washrooms: WashroomSummary[];
  selectedWashroomId?: string;
  selectedBuildingId?: string;
  onSelectWashroom: (id: string) => void;
  onSelectBuilding: (id: string) => void;
  locateRequest: number;
  /** Called with a readable reason when the browser can't provide a position. */
  onLocateError: (message: string) => void;
};

/**
 * Paint a colour straight off a feature's `rank` property.
 *
 * Buildings, badges, and washroom dots all read from this, so a tier looks the
 * same wherever it appears. Purple stays on the interface chrome only.
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

export function CampusMap({
  buildings,
  washrooms,
  selectedWashroomId,
  selectedBuildingId,
  onSelectWashroom,
  onSelectBuilding,
  locateRequest,
  onLocateError,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelectWashroom);
  const onSelectBuildingRef = useRef(onSelectBuilding);
  const onLocateErrorRef = useRef(onLocateError);

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
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: darkCampusStyle,
      center: [UBC_CAMPUS.center.lng, UBC_CAMPUS.center.lat],
      zoom: UBC_CAMPUS.defaultZoom,
      maxBounds: [
        [UBC_CAMPUS.bounds.west - 0.02, UBC_CAMPUS.bounds.south - 0.02],
        [UBC_CAMPUS.bounds.east + 0.02, UBC_CAMPUS.bounds.north + 0.02],
      ],
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "top-right",
    );

    map.on("error", (event) => {
      console.error("[map]", event.error?.message ?? event);
    });

    map.on("load", () => {
      map.addSource("buildings", {
        type: "geojson",
        data: emptyCollection(),
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
            0.42,
            ["==", ["get", "mapped"], 1],
            0.18,
            0.05,
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
          "line-width": ["case", ["==", ["get", "selected"], 1], 2.8, 1.4],
          "line-opacity": [
            "case",
            ["==", ["get", "selected"], 1],
            1,
            ["==", ["get", "mapped"], 1],
            0.9,
            0.35,
          ],
        },
      });
      // Tier badge: a coloured medal sitting on each building.
      map.addLayer({
        id: "building-badge-glow",
        type: "circle",
        source: "badges",
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
        paint: {
          "circle-radius": ["case", ["==", ["get", "selected"], 1], 15, 12],
          "circle-color": rankMatch as never,
          "circle-stroke-width": 2,
          "circle-stroke-color": MAP_INK,
        },
      });
      map.addLayer({
        id: "building-badge-letter",
        type: "symbol",
        source: "badges",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Bold"],
          "text-size": ["case", ["==", ["get", "selected"], 1], 15, 13],
          "text-allow-overlap": true,
        },
        paint: { "text-color": MAP_INK },
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
          "circle-stroke-color": MAP_INK,
        },
      });
    });

    for (const layer of ["building-badge", "building-badge-letter"]) {
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

    map.on("mouseenter", "building-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "building-fill", () => {
      map.getCanvas().style.cursor = "";
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

    for (const layer of ["building-badge-glow", "building-badge", "building-badge-letter"]) {
      if (map.getLayer(layer)) {
        map.setFilter(
          layer,
          selectedBuildingId ? ["!=", ["get", "id"], selectedBuildingId] : null,
        );
      }
    }
  }, [buildings, washrooms, selectedWashroomId, selectedBuildingId]);

  useEffect(() => {
    if (locateRequest === 0) {
      return;
    }
    if (!navigator.geolocation) {
      onLocateErrorRef.current("This browser can't share your location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 16.5,
          essential: true,
        });
      },
      (error) => {
        onLocateErrorRef.current(
          error.code === error.PERMISSION_DENIED
            ? "Location access is off. Allow it in your browser settings, or search for a building instead."
            : "Couldn't find your location. Try again, or search for a building instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [locateRequest]);

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

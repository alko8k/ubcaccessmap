import type { StyleSpecification } from "maplibre-gl";

const TILES = "https://tiles.openfreemap.org/planet";
const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

/**
 * A deliberately sparse light basemap.
 *
 * We used to load OpenFreeMap's `positron` style and invert the canvas in CSS
 * to darken it, which meant every overlay colour had to be pre-inverted too.
 * Drawing our own style instead keeps the rank colours honest and strips the
 * basemap down to ground, water, green space, roads, and building shapes — no
 * POIs, no road names, no boundaries. The only text on the map is ours.
 *
 * Two levels of building: every OSM building gets a soft fill and outline so
 * the campus reads at a glance, and the app's own buildings (drawn on top in
 * CampusMap) get a full-strength edge, 3:1 against the ground.
 */
/** Outline around badges and washroom dots, separating them from the map. */
export const MAP_HALO = "#ffffff";

export const campusStyle: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    openmaptiles: { type: "vector", url: TILES },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#e9edf3" },
    },
    {
      id: "green",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      paint: { "fill-color": "#d9e7d3" },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      filter: ["!=", ["get", "brunnel"], "tunnel"],
      paint: { "fill-color": "#c5d8ea" },
    },
    {
      id: "buildings",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      paint: { "fill-color": "#d3d9e3" },
    },
    {
      id: "building-outlines",
      type: "line",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "line-color": "#a3acba",
        "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.4, 18, 1.2],
      },
    },
    {
      id: "roads-minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 12,
      filter: ["match", ["get", "class"], ["minor", "service", "track", "path"], true, false],
      paint: {
        "line-color": "#ffffff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 18, 6],
      },
    },
    {
      id: "roads-major",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "match",
        ["get", "class"],
        ["motorway", "trunk", "primary", "secondary", "tertiary"],
        true,
        false,
      ],
      paint: {
        "line-color": "#ffffff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 18, 10],
      },
    },
  ],
};

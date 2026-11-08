"use client";
import * as maplibregl from "maplibre-gl";
// Required for marker positioning and controls — import here so EVERY map gets it.
import "maplibre-gl/dist/maplibre-gl.css";

// Worker served from /public (copied from node_modules on install) — see scripts/copy-maplibre-worker.mjs
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/** OpenFreeMap vector tiles (free, no API key). Rendered with MapLibre GL. */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export { maplibregl };

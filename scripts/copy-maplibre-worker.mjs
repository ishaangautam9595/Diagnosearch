// MapLibre's web worker can't be bundled reliably by Turbopack ("Worker failed to load"),
// so we serve it as a static asset and point MapLibre at it with setWorkerUrl().
import { cpSync, mkdirSync } from "node:fs";
const src = "node_modules/maplibre-gl/dist";
mkdirSync("public/maplibre", { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) cpSync(`${src}/${f}`, `public/maplibre/${f}`);

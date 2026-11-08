"use client";
import { useEffect, useRef } from "react";
import { maplibregl, MAP_STYLE_URL } from "@/lib/map-config";

export interface OverviewMarker { lat: number; lng: number; label: string; sub?: string; kind: "home" | "lab" | "branch" }
export interface DemandDot { lat: number; lng: number; count: number }
export interface MapLink { from: { lat: number; lng: number }; to: { lat: number; lng: number }; label: string }
export interface MapArea { lat: number; lng: number; km: number }

function circleGeoJSON(c: { lat: number; lng: number }, km: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    pts.push([c.lng + ((km / 111) * Math.cos(a)) / Math.cos((c.lat * Math.PI) / 180), c.lat + (km / 111) * Math.sin(a)]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [pts] } };
}

/**
 * Read-only map used on the dashboards: markers (home / labs / branches), an optional radius ring,
 * and demand bubbles sized by request count. Drag/zoom is enabled; nothing is editable.
 */
export default function OverviewMap({ center, radiusKm, markers, demand = [], links = [], areas = [], height = 320 }: {
  center: { lat: number; lng: number }; radiusKm?: number; markers: OverviewMarker[]; demand?: DemandDot[]; links?: MapLink[]; areas?: MapArea[]; height?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({ container: box.current, style: MAP_STYLE_URL, center: [center.lng, center.lat], zoom: 10, attributionControl: { compact: true }, cooperativeGestures: true });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const bounds = new maplibregl.LngLatBounds([center.lng, center.lat], [center.lng, center.lat]);
    const maxCount = Math.max(1, ...demand.map((d) => d.count));
    for (const d of demand) {
      const el = document.createElement("div");
      const size = 14 + (d.count / maxCount) * 34;
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:rgb(42 120 214 / .35);border:2px solid #2a78d6;display:grid;place-items:center;font:700 11px system-ui;color:#0d366b;`;
      el.textContent = size > 24 ? String(d.count) : "";
      el.title = `${d.count} request${d.count === 1 ? "" : "s"} from this area`;
      new maplibregl.Marker({ element: el }).setLngLat([d.lng, d.lat]).addTo(m);
      bounds.extend([d.lng, d.lat]);
    }
    for (const k of markers) {
      const el = document.createElement("div");
      if (k.kind === "home") el.className = "ds-user-pin";
      else {
        el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${k.kind === "branch" ? "#0e6f7e" : "#087a50"};border:3px solid #fff;box-shadow:0 1px 5px rgb(0 0 0 / .35);cursor:pointer;`;
      }
      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`<strong style="font:600 13px system-ui"></strong><div style="font:12px system-ui;color:#64748b"></div>`);
      popup.on("open", () => { const root = popup.getElement(); root.querySelector("strong")!.textContent = k.label; root.querySelector("div")!.textContent = k.sub ?? ""; });
      new maplibregl.Marker({ element: el, anchor: k.kind === "home" ? "bottom" : "center" }).setLngLat([k.lng, k.lat]).setPopup(popup).addTo(m);
      bounds.extend([k.lng, k.lat]);
    }
    // Distance lines: a dashed line between two points with the distance written at its midpoint.
    for (const l of links) {
      const el = document.createElement("div");
      el.textContent = l.label;
      el.style.cssText = "background:#fff;border:1.5px solid #087a50;border-radius:999px;padding:2px 9px;font:700 12px system-ui;color:#087a50;box-shadow:0 1px 4px rgb(0 0 0 / .25);white-space:nowrap;pointer-events:none;";
      new maplibregl.Marker({ element: el }).setLngLat([(l.from.lng + l.to.lng) / 2, (l.from.lat + l.to.lat) / 2]).addTo(m);
      bounds.extend([l.from.lng, l.from.lat]); bounds.extend([l.to.lng, l.to.lat]);
    }
    for (const a of areas) for (const p of circleGeoJSON(a, a.km).geometry.coordinates[0]) bounds.extend(p as [number, number]);
    m.on("load", () => {
      links.forEach((l, i) => {
        m.addSource(`link-${i}`, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[l.from.lng, l.from.lat], [l.to.lng, l.to.lat]] } } });
        m.addLayer({ id: `link-${i}`, type: "line", source: `link-${i}`, paint: { "line-color": "#087a50", "line-width": 2.5, "line-dasharray": [2, 1.5] } });
      });
      areas.forEach((a, i) => {
        m.addSource(`area-${i}`, { type: "geojson", data: circleGeoJSON(a, a.km) });
        m.addLayer({ id: `area-fill-${i}`, type: "fill", source: `area-${i}`, paint: { "fill-color": "#2a78d6", "fill-opacity": 0.18 } });
        m.addLayer({ id: `area-line-${i}`, type: "line", source: `area-${i}`, paint: { "line-color": "#2a78d6", "line-width": 1.5 } });
      });
      if (radiusKm) {
        m.addSource("ring", { type: "geojson", data: circleGeoJSON(center, radiusKm) });
        m.addLayer({ id: "ring-fill", type: "fill", source: "ring", paint: { "fill-color": "#16a36a", "fill-opacity": 0.07 } });
        m.addLayer({ id: "ring-line", type: "line", source: "ring", paint: { "line-color": "#087a50", "line-width": 1.5, "line-dasharray": [2, 2] } });
      }
    });
    if (radiusKm) {
      const r = circleGeoJSON(center, radiusKm).geometry.coordinates[0];
      for (const p of r) bounds.extend(p as [number, number]);
    }
    m.fitBounds(bounds, { padding: 40, maxZoom: 13, duration: 0 });
    return () => m.remove();
  }, [center.lat, center.lng, radiusKm, markers, demand, links, areas]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={box} style={{ height }} className="w-full overflow-hidden rounded-xl border border-border" role="application" aria-label="Map" />;
}

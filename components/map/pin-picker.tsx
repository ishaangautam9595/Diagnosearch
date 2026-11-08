"use client";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { maplibregl, MAP_STYLE_URL } from "@/lib/map-config";
import { reversePlace, searchPlaces, type GeoPlace } from "@/lib/client/geocode";

export interface Pin { lat: number; lng: number }

interface Props {
  value: Pin | null;
  onChange: (p: Pin) => void;
  /** Fired with the address for the pin (after a search pick or a pin move). */
  onPlace?: (p: GeoPlace) => void;
  /** Map centre when there is no pin yet. */
  fallback: { lat: number; lng: number; zoom: number };
  className?: string;
}

/** Zomato-style location picker: search an address or click/drag the pin; the address is looked up for you. */
export function PinPickerMap({ value, onChange, onPlace, fallback, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const cb = useRef({ onChange, onPlace });
  useEffect(() => { cb.current = { onChange, onPlace }; });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const place = (p: Pin, fly = false) => {
    cb.current.onChange(p);
    if (fly) map.current?.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.current.getZoom(), 16) });
    reversePlace(p.lat, p.lng).then((r) => { if (r) cb.current.onPlace?.(r); }).catch(() => {});
  };

  useEffect(() => {
    if (!box.current) return;
    const start = value ?? fallback;
    const m = new maplibregl.Map({
      container: box.current, style: MAP_STYLE_URL, center: [start.lng, start.lat],
      zoom: value ? 16 : fallback.zoom, attributionControl: { compact: true },
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const el = document.createElement("div");
    el.className = "ds-user-pin";
    el.setAttribute("aria-label", "Selected location (drag to adjust)");
    const mk = new maplibregl.Marker({ element: el, draggable: true, anchor: "bottom" });
    if (value) mk.setLngLat([value.lng, value.lat]).addTo(m);
    mk.on("dragend", () => { const ll = mk.getLngLat(); place({ lat: ll.lat, lng: ll.lng }); });
    marker.current = mk;
    m.on("click", (e: maplibregl.MapMouseEvent) => {
      mk.setLngLat(e.lngLat).addTo(m);
      place({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync with external value changes.
  useEffect(() => {
    const m = map.current; const mk = marker.current;
    if (!m || !mk || !value) return;
    const cur = mk.getLngLat(); // undefined until the marker has been placed once
    if (!cur || Math.abs(cur.lat - value.lat) > 1e-7 || Math.abs(cur.lng - value.lng) > 1e-7 || !mk.getElement().isConnected) mk.setLngLat([value.lng, value.lat]).addTo(m);
  }, [value]);

  const search = async () => {
    const q = query.trim();
    if (q.length < 3) { setStatus("Type at least 3 characters to search."); return; }
    setBusy(true); setStatus(null);
    try {
      const r = await searchPlaces(q);
      setResults(r);
      if (r.length === 0) setStatus("No matches. Try a nearby landmark or drop the pin on the map.");
    } catch (e) { setStatus((e as Error).message); } finally { setBusy(false); }
  };

  const locate = () => {
    if (!navigator.geolocation) { setStatus("Your browser can't share its location."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => place({ lat: pos.coords.latitude, lng: pos.coords.longitude }, true),
      () => setStatus("Couldn't get your location. Allow access or drop the pin manually."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className={className}>
      <div className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-dark" />
          <input
            aria-label="Search for an address or landmark" placeholder="Search address or landmark"
            value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(); } }}
            className="h-10 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-sm focus-visible:border-primary-dark"
          />
        </div>
        <button type="button" onClick={() => void search()} disabled={busy} className="h-10 cursor-pointer rounded-xl border border-border bg-white px-3 text-sm font-semibold hover:bg-mint disabled:opacity-60">{busy ? "…" : "Search"}</button>
        <button type="button" onClick={locate} className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-white px-3 text-sm font-semibold hover:bg-mint" title="Use my current location">
          <LocateFixed className="size-4 text-primary-dark" /> <span className="hidden sm:inline">My location</span>
        </button>
      </div>
      {results.length > 0 ? (
        <ul className="mb-2 max-h-44 overflow-auto rounded-xl border border-border bg-white p-1 text-sm" role="listbox" aria-label="Search results">
          {results.map((r, i) => (
            <li key={i} role="option" aria-selected="false">
              <button type="button" className="w-full cursor-pointer rounded-lg px-3 py-2 text-left hover:bg-mint"
                onClick={() => { setResults([]); setQuery(r.label.split(",").slice(0, 2).join(",")); place({ lat: r.lat, lng: r.lng }, true); cb.current.onPlace?.(r); }}>
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {status ? <p role="status" className="mb-2 text-xs text-muted">{status}</p> : null}
      <div className="relative h-72 overflow-hidden rounded-xl border border-border sm:h-80">
        <div ref={box} className="h-full w-full" role="application" aria-label="Map. Click to place the pin, or drag the pin to adjust." />
        {!value ? <p className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-white/95 px-3 py-1 text-xs font-medium shadow">Search above or click the map to drop a pin</p> : null}
      </div>
      <p className="mt-1.5 text-xs text-muted">Map © OpenStreetMap contributors · tiles OpenFreeMap · address lookup by Nominatim.</p>
    </div>
  );
}

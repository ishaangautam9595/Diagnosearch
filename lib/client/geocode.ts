/**
 * Address search + reverse geocoding via OpenStreetMap Nominatim (free, no key).
 * Called from the browser only on user actions (search button / pin drop) to respect the public
 * usage policy (max ~1 request/second, no bulk use). For heavy production traffic swap the base
 * URL for a hosted Nominatim/Photon instance.
 */
export interface GeoPlace {
  label: string;
  line1: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
}

interface NominatimItem {
  lat: string; lon: string; display_name: string; name?: string;
  address?: Record<string, string>;
}

const BASE = "https://nominatim.openstreetmap.org";

function toPlace(i: NominatimItem): GeoPlace {
  const a = i.address ?? {};
  const line1 = [a.house_number, a.road ?? i.name, a.neighbourhood ?? a.suburb].filter(Boolean).join(", ");
  return {
    label: i.display_name,
    line1: line1 || i.display_name.split(",").slice(0, 2).join(",").trim(),
    city: a.city ?? a.town ?? a.village ?? a.state_district ?? "",
    pincode: (a.postcode ?? "").replace(/\s/g, "").slice(0, 6),
    lat: Number(i.lat),
    lng: Number(i.lon),
  };
}

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<GeoPlace[]> {
  const url = `${BASE}/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=in&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Address search is unavailable right now.");
  return ((await res.json()) as NominatimItem[]).map(toPlace);
}

export async function reversePlace(lat: number, lng: number, signal?: AbortSignal): Promise<GeoPlace | null> {
  const res = await fetch(`${BASE}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const item = (await res.json()) as NominatimItem & { error?: string };
  if (item.error) return null;
  return { ...toPlace(item), lat, lng };
}

/** Short human label like "Koramangala, Bengaluru". */
export function shortLabel(p: GeoPlace): string {
  const parts = p.label.split(",").map((s) => s.trim());
  return [parts[0], p.city].filter((v, i, arr) => v && arr.indexOf(v) === i).join(", ") || "Pinned on map";
}

export interface PlaceSuggestion { key: string; name: string; subtitle: string; lat: number; lng: number }

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: { osm_id?: number; osm_type?: string; name?: string; street?: string; district?: string; city?: string; county?: string; state?: string; postcode?: string; countrycode?: string };
}

/**
 * As-you-type place suggestions (cities, areas, landmarks) across India via Photon, an OpenStreetMap
 * search built for autocomplete. Nominatim's public server doesn't allow autocomplete, so it is not used here.
 */
export async function autocompletePlaces(q: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en&bbox=68.1,6.7,97.4,35.7`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features: PhotonFeature[] };
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const f of data.features) {
    const p = f.properties;
    if (p.countrycode && p.countrycode !== "IN") continue;
    const name = p.name ?? p.street;
    if (!name) continue;
    const parts = [p.district, p.city, p.county, p.state].filter((v): v is string => !!v && v !== name);
    const subtitle = [...new Set(parts)].slice(0, 3).join(", ");
    const key = `${name}|${subtitle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key: `${p.osm_type}${p.osm_id}-${key}`, name, subtitle, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] });
    if (out.length >= 5) break;
  }
  return out;
}

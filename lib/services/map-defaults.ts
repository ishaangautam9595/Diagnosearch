import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

/** Where to centre an empty map: the average of known laboratory locations, else central India. */
export async function getDefaultMapCenter() {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalogue");
  const agg = await db.laboratoryAddress.aggregate({ where: { latitude: { not: null }, longitude: { not: null } }, _avg: { latitude: true, longitude: true }, _count: true });
  if (agg._count > 0 && agg._avg.latitude != null && agg._avg.longitude != null) return { lat: agg._avg.latitude, lng: agg._avg.longitude, zoom: 9 };
  return { lat: 22.5, lng: 79, zoom: 4 };
}

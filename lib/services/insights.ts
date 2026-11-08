import { db } from "@/lib/db";
import type { EventRow } from "@/lib/analytics";
import { findLabsInRadius } from "./requests";

const DAY = 86_400_000;

/** Compact event list for the lab dashboard (180 days = two 90-day windows for "vs previous period"). */
export async function getLabEvents(laboratoryId: string, days = 180): Promise<EventRow[]> {
  const rows = await db.labEvent.findMany({
    where: { laboratoryId, createdAt: { gte: new Date(Date.now() - days * DAY) } },
    orderBy: { createdAt: "asc" }, take: 20_000,
    select: { type: true, createdAt: true, amount: true, competitorAmount: true, distanceKm: true, responseMinutes: true, approxLat: true, approxLng: true },
  });
  const K = { REQUEST_RECEIVED: "R", OFFER_SENT: "O", OFFER_WON: "W", OFFER_LOST: "L" } as const;
  return rows.map((r) => ({
    t: r.createdAt.toISOString(), k: K[r.type],
    ...(r.amount != null ? { a: Number(r.amount) } : {}),
    ...(r.competitorAmount != null ? { c: Number(r.competitorAmount) } : {}),
    ...(r.distanceKm != null ? { d: r.distanceKm } : {}),
    ...(r.responseMinutes != null ? { r: r.responseMinutes } : {}),
    ...(r.approxLat != null && r.approxLng != null ? { la: r.approxLat, ln: r.approxLng } : {}),
  }));
}

export async function getLabBranches(laboratoryId: string) {
  const rows = await db.laboratoryAddress.findMany({ where: { laboratoryId, latitude: { not: null }, longitude: { not: null } }, select: { id: true, label: true, line1: true, latitude: true, longitude: true } });
  return rows.map((r) => ({ id: r.id, name: r.label ?? r.line1, lat: r.latitude as number, lng: r.longitude as number }));
}

/** Last few things that happened for a lab (for the activity feed). */
export async function getLabActivity(laboratoryId: string, take = 8) {
  return db.labEvent.findMany({ where: { laboratoryId }, orderBy: { createdAt: "desc" }, take, select: { id: true, type: true, createdAt: true, amount: true, competitorAmount: true, distanceKm: true } });
}

/** Everything the patient dashboard visualises. */
export async function getPatientInsights(patientId: string, home: { lat: number; lng: number } | null) {
  const [reqs, nearby] = await Promise.all([
    db.testRequest.findMany({
      where: { patientId }, orderBy: { createdAt: "asc" }, take: 500,
      select: {
        id: true, reference: true, status: true, createdAt: true, firstOfferAt: true, offersAtAccept: true, highestOfferAtAccept: true,
        offers: { select: { totalPrice: true, status: true } },
      },
    }),
    home ? findLabsInRadius(db, home.lat, home.lng) : Promise.resolve([]),
  ]);
  let saved = 0, offersTotal = 0, requestsWithOffers = 0, firstSum = 0, firstN = 0;
  const savings: { reference: string; label: string; saved: number; paid: number; offers: number }[] = [];
  for (const r of reqs) {
    const accepted = r.offers.find((o) => o.status === "ACCEPTED");
    const count = r.status === "ACCEPTED" || r.status === "COMPLETED" ? (r.offersAtAccept ?? r.offers.length) : r.offers.length;
    if (count > 0) { offersTotal += count; requestsWithOffers++; }
    if (r.firstOfferAt) { firstSum += Math.max(0, r.firstOfferAt.getTime() - r.createdAt.getTime()) / 60_000; firstN++; }
    if ((r.status === "ACCEPTED" || r.status === "COMPLETED") && accepted && r.highestOfferAtAccept != null) {
      const s = Math.max(0, Number(r.highestOfferAtAccept) - Number(accepted.totalPrice));
      saved += s;
      savings.push({ reference: r.reference, label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(r.createdAt), saved: s, paid: Number(accepted.totalPrice), offers: count });
    }
  }
  // Requests per week for the last 8 weeks (oldest first).
  const weeks: { label: string; count: number }[] = [];
  const now = Date.now();
  for (let i = 7; i >= 0; i--) {
    const to = now - i * 7 * DAY, from = to - 7 * DAY;
    weeks.push({
      label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(from + DAY)),
      count: reqs.filter((r) => r.createdAt.getTime() > from && r.createdAt.getTime() <= to).length,
    });
  }
  const labs = nearby.length
    ? await db.laboratory.findMany({ where: { id: { in: nearby.map((n) => n.id) } }, select: { id: true, name: true, verificationStatus: true, homeCollectionAvailable: true, addresses: { select: { latitude: true, longitude: true } } } })
    : [];
  return {
    totalRequests: reqs.length,
    accepted: reqs.filter((r) => r.status === "ACCEPTED" || r.status === "COMPLETED").length,
    open: reqs.filter((r) => r.status === "OPEN").length,
    totalSaved: Math.round(saved),
    avgOffersPerRequest: requestsWithOffers ? Math.round((offersTotal / requestsWithOffers) * 10) / 10 : null,
    avgFirstOfferMin: firstN ? Math.round(firstSum / firstN) : null,
    savings: savings.slice(-6),
    weeks,
    nearbyLabs: nearby.flatMap((n) => {
      const lab = labs.find((l) => l.id === n.id);
      // use the branch nearest to the patient for the pin
      const a = lab?.addresses.find((x) => x.latitude != null && x.longitude != null);
      return lab && a ? [{ id: n.id, name: lab.name, distanceKm: n.distanceKm, lat: a.latitude as number, lng: a.longitude as number, verified: lab.verificationStatus === "VERIFIED", home: lab.homeCollectionAvailable }] : [];
    }),
  };
}

/** Payload of GET /api/patient/insights: everything the patient dashboard draws, from the database. */
export async function getPatientDashboard(patient: { id: string; latitude: number | null; longitude: number | null }) {
  const home = patient.latitude != null && patient.longitude != null ? { lat: patient.latitude, lng: patient.longitude } : null;
  const [insights, open] = await Promise.all([
    getPatientInsights(patient.id, home),
    db.testRequest.findMany({
      where: { patientId: patient.id, status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 20,
      select: { id: true, reference: true, offers: { select: { totalPrice: true, laboratory: { select: { name: true } } } } },
    }),
  ]);
  const withOffers = open.find((r) => r.offers.length > 0);
  return {
    generatedAt: new Date().toISOString(),
    home,
    insights,
    offersWaiting: open.reduce((n, r) => n + r.offers.length, 0),
    live: withOffers ? { id: withOffers.id, reference: withOffers.reference, offers: withOffers.offers.map((o) => ({ lab: o.laboratory.name, price: Number(o.totalPrice) })) } : null,
  };
}

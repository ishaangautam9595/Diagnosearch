import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { audit } from "./admin";
import { haversineKm } from "@/lib/geo";

export const offerSchema = z.object({
  totalPrice: z.coerce.number({ error: "Enter your price" }).positive("Enter a price above ₹0").max(1_000_000, "That price looks too high"),
  homeCollectionAvailable: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  reportTimeHours: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(1).max(24 * 30).nullable()),
  note: z.string().trim().max(500).optional().transform((v) => v || null),
});

async function ensureLabActive(laboratoryId: string) {
  const lab = await db.laboratory.findUnique({ where: { id: laboratoryId }, select: { isActive: true, approvalStatus: true } });
  if (!lab || !lab.isActive || lab.approvalStatus !== "APPROVED") throw new AppError("Your laboratory isn't approved yet.", "FORBIDDEN");
}

/** The two live numbers shown at the top of the lab dashboard. */
export async function getLabLiveCounts(laboratoryId: string) {
  const [newRequests, openOffers] = await Promise.all([
    db.requestRecipient.count({ where: { laboratoryId, request: { status: "OPEN", offers: { none: { laboratoryId } } } } }),
    db.offer.count({ where: { laboratoryId, status: "SENT", request: { status: "OPEN" } } }),
  ]);
  return { newRequests, openOffers };
}

export async function getLabOverview(laboratoryId: string) {
  const [lab, newReq, quoted, won, wonValue, recent] = await Promise.all([
    db.laboratory.findUnique({ where: { id: laboratoryId }, include: { addresses: { orderBy: { isPrimary: "desc" } } } }),
    db.requestRecipient.count({ where: { laboratoryId, request: { status: "OPEN", offers: { none: { laboratoryId } } } } }),
    db.offer.count({ where: { laboratoryId, status: "SENT", request: { status: "OPEN" } } }),
    db.offer.count({ where: { laboratoryId, status: "ACCEPTED" } }),
    db.offer.aggregate({ where: { laboratoryId, status: "ACCEPTED" }, _sum: { totalPrice: true } }),
    listLabRequests(laboratoryId, "all", 6),
  ]);
  return { lab, newRequests: newReq, openOffers: quoted, won, wonValue: wonValue._sum.totalPrice ? Number(wonValue._sum.totalPrice) : 0, recent };
}

export type LabRequestFilter = "new" | "quoted" | "won" | "all";

export async function listLabRequests(laboratoryId: string, filter: LabRequestFilter, take = 100) {
  const base = { laboratoryId };
  const where =
    filter === "new" ? { ...base, request: { status: "OPEN" as const, offers: { none: { laboratoryId } } } }
    : filter === "quoted" ? { ...base, request: { status: "OPEN" as const, offers: { some: { laboratoryId } } } }
    : filter === "won" ? { ...base, request: { acceptedLabId: laboratoryId } }
    : base;
  const rows = await db.requestRecipient.findMany({
    where, orderBy: { createdAt: "desc" }, take,
    select: {
      distanceKm: true, firstSeenAt: true, createdAt: true,
      request: {
        select: {
          id: true, reference: true, status: true, service: true, city: true, createdAt: true, acceptedLabId: true,
          patient: { select: { name: true } },
          tests: { select: { name: true } },
          _count: { select: { images: true } },
          offers: { where: { laboratoryId }, select: { totalPrice: true, status: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    ...r.request,
    patientFirstName: r.request.patient.name.split(" ")[0],
    distanceKm: r.distanceKm,
    isNew: r.firstSeenAt === null && r.request.status === "OPEN",
    myOffer: r.request.offers[0] ? { totalPrice: Number(r.request.offers[0].totalPrice), status: r.request.offers[0].status } : null,
    wonByMe: r.request.acceptedLabId === laboratoryId,
  }));
}

/**
 * A lab sees a request only while it is a recipient. The patient's full name, contact details and
 * exact address are revealed only to the laboratory whose offer was accepted.
 */
export async function getLabRequest(laboratoryId: string, requestId: string) {
  const rec = await db.requestRecipient.findUnique({ where: { requestId_laboratoryId: { requestId, laboratoryId } } });
  if (!rec) return null;
  if (!rec.firstSeenAt) await db.requestRecipient.update({ where: { id: rec.id }, data: { firstSeenAt: new Date() } });
  const r = await db.testRequest.findUnique({
    where: { id: requestId },
    include: {
      tests: { orderBy: { name: "asc" } },
      images: { select: { id: true, width: true, height: true }, orderBy: { createdAt: "asc" } },
      patient: { select: { name: true, phone: true, email: true } },
      offers: { where: { laboratoryId } },
      review: { select: { rating: true, comment: true } },
    },
  });
  if (!r) return null;
  const mine = r.acceptedLabId === laboratoryId;
  // Where the patient is. Before acceptance only an approximate point (rounded to ~1 km) is shared; the winner gets the exact pin.
  const approx = (n: number) => Math.round(n * 100) / 100;
  const location = mine ? { lat: r.latitude, lng: r.longitude, exact: true } : { lat: approx(r.latitude), lng: approx(r.longitude), exact: false };
  const branchRows = await db.laboratoryAddress.findMany({ where: { laboratoryId, latitude: { not: null }, longitude: { not: null } }, select: { id: true, label: true, line1: true, latitude: true, longitude: true } });
  const withDist = branchRows.map((b) => ({ id: b.id, name: b.label ?? b.line1, lat: b.latitude as number, lng: b.longitude as number, km: Math.round(haversineKm({ lat: r.latitude, lng: r.longitude }, { lat: b.latitude as number, lng: b.longitude as number }) * 10) / 10 }));
  const nearestId = withDist.length ? withDist.reduce((a, b) => (b.km < a.km ? b : a)).id : null;
  const branches = withDist.map((b) => ({ ...b, nearest: b.id === nearestId }));
  const offer = r.offers[0] ? { ...r.offers[0], totalPrice: Number(r.offers[0].totalPrice) } : null;
  return {
    id: r.id, reference: r.reference, status: r.status, service: r.service, notes: r.notes, createdAt: r.createdAt,
    coinsAwarded: r.coinsAwarded, completedAt: r.completedAt, review: mine ? r.review : null,
    tests: r.tests, images: r.images, distanceKm: rec.distanceKm, offer, wonByMe: mine, location, branches,
    patient: mine
      ? { name: r.patient.name, phone: r.patient.phone, email: r.patient.email, address: `${r.addressLine}, ${r.city} ${r.pincode}`, revealed: true as const }
      : { name: r.patient.name.split(" ")[0], phone: null, email: null, address: `${r.city} ${r.pincode} (about ${rec.distanceKm} km away)`, revealed: false as const },
  };
}

export async function sendOffer(laboratoryId: string, actorId: string, requestId: string, raw: unknown) {
  const parsed = offerSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Please check your offer.");
  await ensureLabActive(laboratoryId);
  const input = parsed.data;
  return db.$transaction(async (tx) => {
    const rec = await tx.requestRecipient.findUnique({ where: { requestId_laboratoryId: { requestId, laboratoryId } } });
    const req = await tx.testRequest.findUnique({ where: { id: requestId }, select: { status: true } });
    if (!rec || !req) throw new AppError("This request is no longer available.", "NOT_FOUND");
    if (req.status !== "OPEN") throw new AppError("The patient has already closed this request.", "CONFLICT");
    const data = { totalPrice: input.totalPrice, homeCollectionAvailable: input.homeCollectionAvailable, reportTimeHours: input.reportTimeHours, note: input.note };
    const existing = await tx.offer.findUnique({ where: { requestId_laboratoryId: { requestId, laboratoryId } } });
    const offer = existing
      ? await tx.offer.update({ where: { id: existing.id }, data })
      : await tx.offer.create({ data: { requestId, laboratoryId, ...data } });
    if (!existing) {
      await tx.labEvent.create({
        data: { laboratoryId, type: "OFFER_SENT", amount: input.totalPrice, responseMinutes: Math.max(0, Math.round((Date.now() - rec.createdAt.getTime()) / 60_000)) },
      });
      await tx.testRequest.updateMany({ where: { id: requestId, firstOfferAt: null }, data: { firstOfferAt: new Date() } });
    }
    await audit(actorId, existing ? "offer.updated" : "offer.sent", "Offer", offer.id, { requestId }, tx);
    return offer;
  });
}

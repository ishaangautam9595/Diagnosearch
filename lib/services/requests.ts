import { randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { deleteObjects } from "@/lib/storage";
import { bboxAround, haversineKm } from "@/lib/geo";
import { audit } from "./admin";
import { getRatingSummaries } from "./loyalty";
import { MAX_REQUEST_TESTS } from "./test-catalogue";
import { MAX_IMAGES_PER_REQUEST } from "./prescriptions";

/** Every laboratory within this distance of the patient's address receives the request. */
export const REQUEST_RADIUS_KM = 20;

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateReference(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `TR-${s}`;
}

export const requestInputSchema = z.object({
  testIds: z.array(z.string().uuid()).max(MAX_REQUEST_TESTS).default([]),
  customTests: z.array(z.string().trim().min(2, "Test names need at least 2 letters").max(80)).max(5).default([]),
  imageIds: z.array(z.string().uuid()).max(MAX_IMAGES_PER_REQUEST).default([]),
  notes: z.string().trim().max(500).optional().transform((v) => v || null),
  service: z.enum(["ANY", "HOME_COLLECTION", "WALK_IN"]).default("ANY"),
});

/** Labs that would receive a request from this point (active, approved, a branch within the radius). */
export async function findLabsInRadius(
  client: Pick<typeof db, "laboratory">,
  lat: number, lng: number, radiusKm = REQUEST_RADIUS_KM, service: "ANY" | "HOME_COLLECTION" | "WALK_IN" = "ANY",
) {
  const box = bboxAround(lat, lng, radiusKm);
  const labs = await client.laboratory.findMany({
    where: {
      isActive: true, approvalStatus: "APPROVED",
      ...(service === "HOME_COLLECTION" ? { homeCollectionAvailable: true } : {}),
      addresses: { some: { latitude: { gte: box.minLat, lte: box.maxLat }, longitude: { gte: box.minLng, lte: box.maxLng } } },
    },
    select: { id: true, addresses: { select: { latitude: true, longitude: true } } },
  });
  const out: { id: string; distanceKm: number }[] = [];
  for (const l of labs) {
    let best = Infinity;
    for (const a of l.addresses) {
      if (a.latitude == null || a.longitude == null) continue;
      best = Math.min(best, haversineKm({ lat, lng }, { lat: a.latitude, lng: a.longitude }));
    }
    if (best <= radiusKm) out.push({ id: l.id, distanceKm: Math.round(best * 10) / 10 });
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Creates a request and sends it to every laboratory within 20 km of the patient's saved address. */
export async function createRequest(patientId: string, raw: unknown) {
  const parsed = requestInputSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Please check your request.");
  const input = parsed.data;
  if (input.testIds.length + input.customTests.length === 0 && input.imageIds.length === 0) {
    throw new AppError("Upload your prescription or add at least one test.");
  }
  if (input.testIds.length + input.customTests.length > MAX_REQUEST_TESTS) throw new AppError(`You can add up to ${MAX_REQUEST_TESTS} tests per request.`);
  await consumeRateLimit(`request:${patientId}`, 15, 24 * 60 * 60_000);

  const patient = await db.user.findUnique({ where: { id: patientId } });
  if (!patient || patient.role !== "PATIENT") throw new AppError("Only patients can create requests.", "FORBIDDEN");
  if (patient.latitude == null || patient.longitude == null || !patient.addressLine || !patient.city || !patient.pincode) {
    throw new AppError("Add your address with a map pin in your profile first.");
  }
  const addr = { addressLine: patient.addressLine, city: patient.city, pincode: patient.pincode, latitude: patient.latitude, longitude: patient.longitude };

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const catalogue = input.testIds.length
          ? await tx.diagnosticTest.findMany({ where: { id: { in: [...new Set(input.testIds)] }, isActive: true }, select: { id: true, name: true } })
          : [];
        if (catalogue.length !== new Set(input.testIds).size) throw new AppError("One of the selected tests is no longer available.");
        const images = input.imageIds.length
          ? await tx.prescriptionImage.findMany({ where: { id: { in: input.imageIds }, ownerId: patientId, requestId: null }, select: { id: true } })
          : [];
        if (images.length !== new Set(input.imageIds).size) throw new AppError("A prescription image expired. Please upload it again.");

        const labs = await findLabsInRadius(tx as unknown as typeof db, addr.latitude, addr.longitude, REQUEST_RADIUS_KM, input.service);
        const request = await tx.testRequest.create({
          data: {
            reference: generateReference(), patientId, notes: input.notes, service: input.service, ...addr, radiusKm: REQUEST_RADIUS_KM,
            tests: { create: [...catalogue.map((t) => ({ testId: t.id, name: t.name })), ...input.customTests.map((name) => ({ name }))] },
            recipients: { create: labs.map((l) => ({ laboratoryId: l.id, distanceKm: l.distanceKm })) },
          },
          select: { id: true, reference: true },
        });
        const approx = (n: number) => Math.round(n * 100) / 100;
        if (labs.length) {
          await tx.labEvent.createMany({
            data: labs.map((l) => ({ laboratoryId: l.id, type: "REQUEST_RECEIVED" as const, distanceKm: l.distanceKm, approxLat: approx(addr.latitude), approxLng: approx(addr.longitude) })),
          });
        }
        if (images.length) await tx.prescriptionImage.updateMany({ where: { id: { in: images.map((i) => i.id) } }, data: { requestId: request.id } });
        await audit(patientId, "request.created", "TestRequest", request.id, { labs: labs.length }, tx);
        return { ...request, labsNotified: labs.length };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue; // reference collision
      throw e;
    }
  }
  throw new AppError("Could not create the request. Please try again.");
}

export async function listPatientRequests(patientId: string) {
  const rows = await db.testRequest.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, reference: true, status: true, createdAt: true, acceptedLabId: true,
      tests: { select: { name: true } },
      _count: { select: { images: true, offers: true, recipients: true } },
      offers: { select: { totalPrice: true, status: true, laboratory: { select: { name: true } } }, orderBy: { totalPrice: "asc" } },
    },
  });
  return rows.map((r) => ({
    ...r,
    offers: r.offers.map((o) => ({ ...o, totalPrice: Number(o.totalPrice) })),
    lowest: r.offers.length ? Number(r.offers[0].totalPrice) : null,
  }));
}

export async function getPatientRequest(patientId: string, id: string) {
  const r = await db.testRequest.findFirst({
    where: { id, patientId },
    include: {
      tests: { orderBy: { name: "asc" } },
      images: { select: { id: true, width: true, height: true }, orderBy: { createdAt: "asc" } },
      review: { select: { rating: true, comment: true, createdAt: true } },
      _count: { select: { recipients: true } },
      offers: {
        orderBy: { totalPrice: "asc" },
        include: { laboratory: { select: { id: true, slug: true, name: true, verificationStatus: true, accreditation: true, openingHours: true, phone: true } } },
      },
    },
  });
  if (!r) return null;
  const labIds = r.offers.map((o) => o.laboratoryId);
  const [last, dist, ratings] = await Promise.all([
    db.chatMessage.groupBy({ by: ["laboratoryId"], where: { requestId: id, laboratoryId: { in: labIds } }, _count: { _all: true }, _max: { createdAt: true } }),
    db.requestRecipient.findMany({ where: { requestId: id, laboratoryId: { in: labIds } }, select: { laboratoryId: true, distanceKm: true } }),
    getRatingSummaries(labIds),
  ]);
  return {
    ...r,
    offers: r.offers.map((o) => ({
      ...o,
      totalPrice: Number(o.totalPrice),
      messageCount: last.find((l) => l.laboratoryId === o.laboratoryId)?._count._all ?? 0,
      distanceKm: dist.find((d) => d.laboratoryId === o.laboratoryId)?.distanceKm ?? null,
      rating: ratings.get(o.laboratoryId) ?? { average: null, count: 0 },
    })),
  };
}

/** Cancels an open request and deletes its offers, chats and prescription images. */
export async function cancelRequest(patientId: string, requestId: string) {
  let keys: (string | null)[] = [];
  await db.$transaction(async (tx) => {
    const res = await tx.testRequest.updateMany({ where: { id: requestId, patientId, status: "OPEN" }, data: { status: "CANCELLED" } });
    if (res.count !== 1) throw new AppError("This request can't be cancelled.", "CONFLICT");
    await tx.offer.deleteMany({ where: { requestId } });
    await tx.chatMessage.deleteMany({ where: { requestId } });
    await tx.requestRecipient.deleteMany({ where: { requestId } });
    keys = (await tx.prescriptionImage.findMany({ where: { requestId }, select: { storageKey: true } })).map((i) => i.storageKey);
    await tx.prescriptionImage.deleteMany({ where: { requestId } });
    await audit(patientId, "request.cancelled", "TestRequest", requestId, undefined, tx);
  });
  await deleteObjects(keys);
}

/**
 * Accepting an offer closes the request: every other laboratory's offer, chat and access to the
 * request (including the prescription) is deleted. Only the chosen laboratory keeps its thread.
 */
export async function acceptOffer(patientId: string, offerId: string) {
  return db.$transaction(async (tx) => {
    const offer = await tx.offer.findUnique({ where: { id: offerId }, include: { request: true } });
    if (!offer || offer.request.patientId !== patientId) throw new AppError("Offer not found.", "NOT_FOUND");
    if (offer.status !== "SENT") throw new AppError("This offer is no longer available.", "CONFLICT");
    const closed = await tx.testRequest.updateMany({
      where: { id: offer.requestId, patientId, status: "OPEN" },
      data: { status: "ACCEPTED", acceptedOfferId: offer.id, acceptedLabId: offer.laboratoryId, acceptedAt: new Date() },
    });
    if (closed.count !== 1) throw new AppError("This request has already been closed.", "CONFLICT");
    await tx.offer.update({ where: { id: offer.id }, data: { status: "ACCEPTED" } });
    // Before the losing offers are deleted, keep what the patient (and each lab) needs for insights.
    const all = await tx.offer.findMany({ where: { requestId: offer.requestId }, select: { id: true, laboratoryId: true, totalPrice: true } });
    const highest = all.reduce((m, o) => Math.max(m, Number(o.totalPrice)), 0);
    await tx.testRequest.update({ where: { id: offer.requestId }, data: { offersAtAccept: all.length, highestOfferAtAccept: highest } });
    await tx.labEvent.createMany({
      data: all.map((o) => o.id === offer.id
        ? { laboratoryId: o.laboratoryId, type: "OFFER_WON" as const, amount: o.totalPrice }
        : { laboratoryId: o.laboratoryId, type: "OFFER_LOST" as const, amount: o.totalPrice, competitorAmount: offer.totalPrice }),
    });
    const lost = await tx.offer.deleteMany({ where: { requestId: offer.requestId, id: { not: offer.id } } });
    const chats = await tx.chatMessage.deleteMany({ where: { requestId: offer.requestId, laboratoryId: { not: offer.laboratoryId } } });
    await tx.requestRecipient.deleteMany({ where: { requestId: offer.requestId, laboratoryId: { not: offer.laboratoryId } } });
    await audit(patientId, "offer.accepted", "Offer", offer.id, { requestId: offer.requestId, discardedOffers: lost.count, discardedMessages: chats.count }, tx);
    return { requestId: offer.requestId, laboratoryId: offer.laboratoryId, discardedOffers: lost.count };
  });
}

export const REQUESTS_PAGE_SIZE = 8;
export const REQUEST_FILTERS = ["all", "open", "offers", "accepted", "completed", "cancelled"] as const;
export type RequestFilter = (typeof REQUEST_FILTERS)[number];
export const REQUEST_SORTS = ["newest", "oldest", "offers"] as const;
export type RequestSort = (typeof REQUEST_SORTS)[number];

function filterWhere(f: RequestFilter): Prisma.TestRequestWhereInput {
  switch (f) {
    case "open": return { status: "OPEN" };
    case "offers": return { status: "OPEN", offers: { some: {} } };
    case "accepted": return { status: "ACCEPTED" };
    case "completed": return { status: "COMPLETED" };
    case "cancelled": return { status: "CANCELLED" };
    default: return {};
  }
}

/** Paginated, searchable list for "My requests". Search matches the reference, test names and the names of labs that quoted. */
export async function searchPatientRequests(patientId: string, args: { q?: string; filter?: RequestFilter; sort?: RequestSort; page?: number }) {
  const q = (args.q ?? "").trim().slice(0, 80);
  const filter = args.filter ?? "all";
  const sort = args.sort ?? "newest";
  const search: Prisma.TestRequestWhereInput = q ? {
    OR: [
      { reference: { contains: q, mode: "insensitive" } },
      { tests: { some: { name: { contains: q, mode: "insensitive" } } } },
      { offers: { some: { laboratory: { name: { contains: q, mode: "insensitive" } } } } },
    ],
  } : {};
  const where: Prisma.TestRequestWhereInput = { patientId, AND: [search, filterWhere(filter)] };
  const total = await db.testRequest.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / REQUESTS_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(args.page ?? 1) || 1), pageCount);
  const orderBy: Prisma.TestRequestOrderByWithRelationInput[] =
    sort === "oldest" ? [{ createdAt: "asc" }] : sort === "offers" ? [{ offers: { _count: "desc" } }, { createdAt: "desc" }] : [{ createdAt: "desc" }];
  const [rows, grouped, withOffers] = await Promise.all([
    db.testRequest.findMany({
      where, orderBy, skip: (page - 1) * REQUESTS_PAGE_SIZE, take: REQUESTS_PAGE_SIZE,
      select: {
        id: true, reference: true, status: true, createdAt: true, completedAt: true, coinsAwarded: true,
        tests: { select: { name: true } },
        review: { select: { rating: true } },
        _count: { select: { images: true, offers: true, recipients: true } },
        offers: { select: { totalPrice: true, status: true, laboratory: { select: { name: true } } }, orderBy: { totalPrice: "asc" } },
      },
    }),
    db.testRequest.groupBy({ by: ["status"], where: { patientId }, _count: { _all: true } }),
    db.testRequest.count({ where: { patientId, status: "OPEN", offers: { some: {} } } }),
  ]);
  const n = (s: string) => grouped.find((g) => g.status === s)?._count._all ?? 0;
  const counts: Record<RequestFilter, number> = {
    all: grouped.reduce((a, g) => a + g._count._all, 0), open: n("OPEN"), offers: withOffers, accepted: n("ACCEPTED"), completed: n("COMPLETED"), cancelled: n("CANCELLED"),
  };
  const items = rows.map((r) => {
    const won = r.offers.find((o) => o.status === "ACCEPTED");
    return {
      ...r,
      offers: undefined,
      lowest: r.offers.length ? Number(r.offers[0].totalPrice) : null,
      labName: won?.laboratory.name ?? null,
      paid: won ? Number(won.totalPrice) : null,
    };
  });
  return { items, total, page, pageCount, counts, q, filter, sort };
}

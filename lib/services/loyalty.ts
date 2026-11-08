import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { audit } from "./admin";

/** Patients earn 1 loyalty coin for every ₹10 of a completed booking (at least 1). */
export const RUPEES_PER_COIN = 10;
export function coinsForAmount(amount: number): number {
  return Math.max(1, Math.floor(amount / RUPEES_PER_COIN));
}

export const reviewSchema = z.object({
  rating: z.coerce.number({ error: "Choose a star rating" }).int("Choose a star rating").min(1, "Choose a star rating").max(5, "Choose a star rating"),
  comment: z.string().trim().max(500, "Keep your feedback under 500 characters").optional().transform((v) => v || null),
});

/**
 * The lab confirms the booking is done. Atomically moves ACCEPTED → COMPLETED and credits the
 * patient's loyalty coins. The status guard plus the unique `LoyaltyTransaction.requestId` make a
 * double click or concurrent call impossible to pay twice.
 */
export async function completeRequest(laboratoryId: string, actorId: string, requestId: string) {
  return db.$transaction(async (tx) => {
    const req = await tx.testRequest.findUnique({
      where: { id: requestId },
      select: { patientId: true, acceptedLabId: true, reference: true, offers: { where: { laboratoryId, status: "ACCEPTED" }, select: { totalPrice: true } } },
    });
    if (!req || req.acceptedLabId !== laboratoryId) throw new AppError("Booking not found.", "NOT_FOUND");
    const price = req.offers[0] ? Number(req.offers[0].totalPrice) : 0;
    const coins = coinsForAmount(price);
    const done = await tx.testRequest.updateMany({
      where: { id: requestId, acceptedLabId: laboratoryId, status: "ACCEPTED" },
      data: { status: "COMPLETED", completedAt: new Date(), coinsAwarded: coins },
    });
    if (done.count !== 1) throw new AppError("This booking is already completed.", "CONFLICT");
    await tx.loyaltyTransaction.create({ data: { userId: req.patientId, requestId, coins, reason: `Completed booking ${req.reference}` } });
    await tx.user.update({ where: { id: req.patientId }, data: { loyaltyCoins: { increment: coins } } });
    await audit(actorId, "request.completed", "TestRequest", requestId, { coins }, tx);
    return { coins };
  });
}

/** A patient reviews the lab for one of their completed bookings (once). */
export async function submitReview(patientId: string, requestId: string, raw: unknown) {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Please check your review.");
  const req = await db.testRequest.findFirst({ where: { id: requestId, patientId }, select: { status: true, acceptedLabId: true, review: { select: { id: true } } } });
  if (!req) throw new AppError("Booking not found.", "NOT_FOUND");
  if (req.status !== "COMPLETED" || !req.acceptedLabId) throw new AppError("You can review a lab once it marks your booking completed.", "CONFLICT");
  if (req.review) throw new AppError("You've already reviewed this booking.", "CONFLICT");
  try {
    const review = await db.labReview.create({ data: { laboratoryId: req.acceptedLabId, patientId, requestId, rating: parsed.data.rating, comment: parsed.data.comment } });
    await audit(patientId, "review.created", "LabReview", review.id, { requestId, rating: review.rating });
    return review;
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && e.code === "P2002") throw new AppError("You've already reviewed this booking.", "CONFLICT");
    throw e;
  }
}

export interface RatingSummary { average: number | null; count: number }

/** Average rating and count for several labs in one query. */
export async function getRatingSummaries(laboratoryIds: string[]): Promise<Map<string, RatingSummary>> {
  const out = new Map<string, RatingSummary>(laboratoryIds.map((id) => [id, { average: null, count: 0 }]));
  if (!laboratoryIds.length) return out;
  const rows = await db.labReview.groupBy({ by: ["laboratoryId"], where: { laboratoryId: { in: laboratoryIds } }, _avg: { rating: true }, _count: { _all: true } });
  for (const r of rows) out.set(r.laboratoryId, { average: r._avg.rating == null ? null : Math.round(r._avg.rating * 10) / 10, count: r._count._all });
  return out;
}

/** Public reviews: reviewer shown by first name only. */
export async function listLabReviews(laboratoryId: string, take = 50) {
  const rows = await db.labReview.findMany({
    where: { laboratoryId }, orderBy: { createdAt: "desc" }, take,
    select: { id: true, rating: true, comment: true, createdAt: true, patient: { select: { name: true } } },
  });
  return rows.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, reviewer: r.patient.name.trim().split(/\s+/)[0] || "Patient" }));
}

export async function getRatingBreakdown(laboratoryId: string) {
  const rows = await db.labReview.groupBy({ by: ["rating"], where: { laboratoryId }, _count: { _all: true } });
  return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: rows.find((r) => r.rating === stars)?._count._all ?? 0 }));
}

export async function getLoyalty(userId: string) {
  const [user, history] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { loyaltyCoins: true } }),
    db.loyaltyTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, coins: true, reason: true, createdAt: true } }),
  ]);
  return { balance: user?.loyaltyCoins ?? 0, history };
}

/** Active, approved lab with its public profile; null otherwise. */
export async function getPublicLab(slug: string) {
  return db.laboratory.findFirst({
    where: { slug, isActive: true, approvalStatus: "APPROVED" },
    select: {
      id: true, slug: true, name: true, description: true, phone: true, openingHours: true, accreditation: true, verificationStatus: true, homeCollectionAvailable: true,
      addresses: { select: { id: true, label: true, line1: true, line2: true, city: true, pincode: true }, orderBy: { isPrimary: "desc" } },
    },
  });
}

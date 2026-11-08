import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";

const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO8eL1oXnmXn3kzK3b0m3i7pQeWnQK5Oa";

export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Prisma.InputJsonValue,
  client: Pick<typeof db, "auditLog"> = db,
) {
  await client.auditLog.create({ data: { actorId, action, entityType, entityId: entityId ?? null, metadata } });
}

/** Verifies admin credentials. Rate limited per email and per IP; never reveals which part was wrong. */
export async function verifyAdminCredentials(email: string, password: string, ip: string | null) {
  const normalized = email.trim().toLowerCase();
  await consumeRateLimit(`login:email:${normalized}`, 8, 15 * 60_000);
  if (ip) await consumeRateLimit(`login:ip:${ip}`, 30, 15 * 60_000);
  const user = await db.user.findUnique({ where: { email: normalized } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.isActive || !ok || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    await audit(user?.id ?? null, "auth.login_failed", "User", user?.id, { email: normalized });
    throw new AppError("Invalid email or password.", "UNAUTHORIZED");
  }
  await audit(user.id, "auth.login", "User", user.id);
  return { id: user.id, email: user.email as string, name: user.name, role: user.role };
}

export async function getDashboardStats() {
  const [patients, labs, activeLabs, pendingApplications, tests, byStatus, offers, accepted, recent] = await Promise.all([
    db.user.count({ where: { role: "PATIENT" } }),
    db.laboratory.count({ where: { approvalStatus: "APPROVED" } }),
    db.laboratory.count({ where: { isActive: true, approvalStatus: "APPROVED" } }),
    db.laboratory.count({ where: { approvalStatus: "PENDING" } }),
    db.diagnosticTest.count({ where: { isActive: true } }),
    db.testRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    db.offer.count(),
    db.offer.aggregate({ where: { status: "ACCEPTED" }, _sum: { totalPrice: true }, _count: { _all: true } }),
    db.testRequest.findMany({
      orderBy: { createdAt: "desc" }, take: 8,
      select: {
        id: true, reference: true, status: true, createdAt: true, city: true,
        patient: { select: { name: true } },
        _count: { select: { offers: true, recipients: true } },
      },
    }),
  ]);
  const n = (st: string) => byStatus.find((b) => b.status === st)?._count._all ?? 0;
  return {
    patients, labs, activeLabs, pendingApplications, tests,
    requests: byStatus.reduce((a, b) => a + b._count._all, 0),
    open: n("OPEN"), acceptedRequests: n("ACCEPTED"), cancelled: n("CANCELLED"),
    openOffers: offers, // offers still on the table (lost offers are deleted when a patient accepts)
    wonOffers: accepted._count._all,
    wonValue: accepted._sum.totalPrice ? Number(accepted._sum.totalPrice) : 0,
    recent,
  };
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const s = await db.setting.findUnique({ where: { key } });
  return s?.value ?? fallback;
}

export async function setSettings(actorId: string, values: Record<string, string>) {
  await db.$transaction(async (tx) => {
    for (const [key, value] of Object.entries(values)) {
      await tx.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    await audit(actorId, "settings.updated", "Setting", null, { keys: Object.keys(values) }, tx);
  });
}

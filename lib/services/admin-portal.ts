import { db } from "@/lib/db";
import type { Prisma, RequestStatus } from "@/generated/prisma/client";

export async function listLabsForAdmin() {
  return db.laboratory.findMany({
    orderBy: { name: "asc" },
    include: {
      addresses: { take: 1, orderBy: { isPrimary: "desc" } },
      _count: { select: { recipients: true, offers: true } },
      owners: { select: { id: true, email: true, phone: true, lastLoginAt: true }, take: 1 },
    },
  });
}

export async function getLabForAdmin(id: string) {
  return db.laboratory.findUnique({ where: { id }, include: { addresses: { orderBy: { isPrimary: "desc" } } } });
}

export async function listRequestsForAdmin(args: { status?: RequestStatus; page?: number; pageSize?: number }) {
  const pageSize = args.pageSize ?? 20;
  const page = Math.max(args.page ?? 1, 1);
  const where: Prisma.TestRequestWhereInput = args.status ? { status: args.status } : {};
  const [total, rows] = await Promise.all([
    db.testRequest.count({ where }),
    db.testRequest.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      select: {
        id: true, reference: true, status: true, createdAt: true, city: true,
        patient: { select: { name: true } },
        _count: { select: { tests: true, images: true, recipients: true, offers: true } },
      },
    }),
  ]);
  return { total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), rows };
}

export async function getRequestForAdmin(id: string) {
  const r = await db.testRequest.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, name: true, phone: true, email: true } },
      tests: { orderBy: { name: "asc" } },
      images: { select: { id: true } },
      recipients: { include: { laboratory: { select: { id: true, name: true } } }, orderBy: { distanceKm: "asc" } },
      offers: { include: { laboratory: { select: { name: true } } }, orderBy: { totalPrice: "asc" } },
    },
  });
  if (!r) return null;
  const msgs = await db.chatMessage.groupBy({ by: ["laboratoryId"], where: { requestId: id }, _count: { _all: true } });
  return {
    ...r,
    offers: r.offers.map((o) => ({ ...o, totalPrice: Number(o.totalPrice), messageCount: msgs.find((m) => m.laboratoryId === o.laboratoryId)?._count._all ?? 0 })),
  };
}

export async function listPatients(args: { q?: string; page?: number; pageSize?: number }) {
  const pageSize = args.pageSize ?? 25;
  const page = Math.max(args.page ?? 1, 1);
  const q = args.q?.trim();
  const where: Prisma.UserWhereInput = {
    role: "PATIENT",
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, name: true, email: true, phone: true, city: true, isActive: true, createdAt: true, lastLoginAt: true, _count: { select: { requests: true } } },
    }),
  ]);
  return { total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), rows };
}

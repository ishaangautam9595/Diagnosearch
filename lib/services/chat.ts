import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";

export interface Actor { id: string; role: Role; laboratoryId: string | null }

export type ChatAccess = { canRead: boolean; canWrite: boolean; as: "PATIENT" | "LAB" | "ADMIN" | null };

/** Who may read / write the chat between a patient and one laboratory about one request. */
export async function chatAccess(actor: Actor, requestId: string, laboratoryId: string): Promise<ChatAccess> {
  const none: ChatAccess = { canRead: false, canWrite: false, as: null };
  const req = await db.testRequest.findUnique({ where: { id: requestId }, select: { patientId: true, status: true, acceptedLabId: true } });
  if (!req) return none;
  const rec = await db.requestRecipient.findUnique({ where: { requestId_laboratoryId: { requestId, laboratoryId } }, select: { id: true } });
  const writable = req.status === "OPEN" ? !!rec : req.status === "ACCEPTED" && req.acceptedLabId === laboratoryId && !!rec;
  if (actor.role === "PATIENT" && req.patientId === actor.id && rec) return { canRead: true, canWrite: writable, as: "PATIENT" };
  if (actor.role === "LAB_OWNER" && actor.laboratoryId === laboratoryId && rec) return { canRead: true, canWrite: writable, as: "LAB" };
  if (actor.role === "ADMIN" || actor.role === "STAFF") return { canRead: true, canWrite: false, as: "ADMIN" };
  return none;
}

export async function listMessages(actor: Actor, requestId: string, laboratoryId: string, after?: Date) {
  const access = await chatAccess(actor, requestId, laboratoryId);
  if (!access.canRead) throw new AppError("Chat not found.", "NOT_FOUND");
  const rows = await db.chatMessage.findMany({
    where: { requestId, laboratoryId, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: "asc" }, take: 300,
    select: { id: true, sender: true, body: true, createdAt: true },
  });
  return { messages: rows, canWrite: access.canWrite };
}

export async function sendMessage(actor: Actor, requestId: string, laboratoryId: string, body: string) {
  const text = body.trim();
  if (!text) throw new AppError("Type a message first.");
  if (text.length > 1000) throw new AppError("Message is too long (max 1000 characters).");
  const access = await chatAccess(actor, requestId, laboratoryId);
  if (!access.canRead) throw new AppError("Chat not found.", "NOT_FOUND");
  if (!access.canWrite || access.as === "ADMIN" || access.as === null) throw new AppError("This conversation is closed.", "CONFLICT");
  await consumeRateLimit(`chat:${actor.id}`, 40, 60_000);
  return db.chatMessage.create({
    data: { requestId, laboratoryId, senderId: actor.id, sender: access.as === "LAB" ? "LAB" : "PATIENT", body: text },
    select: { id: true, sender: true, body: true, createdAt: true },
  });
}

/** Authorisation for prescription images (served by /api/prescriptions/[id]). */
export async function canViewImage(actor: Actor, imageId: string): Promise<boolean> {
  const img = await db.prescriptionImage.findUnique({ where: { id: imageId }, select: { ownerId: true, requestId: true } });
  if (!img) return false;
  if (actor.role === "ADMIN" || actor.role === "STAFF") return true;
  if (actor.id === img.ownerId) return true;
  if (!img.requestId || actor.role !== "LAB_OWNER" || !actor.laboratoryId) return false;
  const rec = await db.requestRecipient.findUnique({ where: { requestId_laboratoryId: { requestId: img.requestId, laboratoryId: actor.laboratoryId } }, select: { id: true } });
  return !!rec;
}

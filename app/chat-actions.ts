"use server";
import { getSession } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { sendMessage } from "@/lib/services/chat";

export type ChatSendResult = { ok: true; message: { id: string; sender: "PATIENT" | "LAB"; body: string; createdAt: string } } | { ok: false; error: string };

/** Shared by the patient and lab chat panels. Authorisation lives in chatAccess(). */
export async function sendChatAction(requestId: string, laboratoryId: string, body: string): Promise<ChatSendResult> {
  try {
    const s = await getSession();
    if (!s) throw new AppError("You must be signed in.", "UNAUTHORIZED");
    const m = await sendMessage({ id: s.id, role: s.role, laboratoryId: s.laboratoryId }, requestId, laboratoryId, body);
    return { ok: true, message: { ...m, createdAt: m.createdAt.toISOString() } };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Couldn't send. Please try again." };
  }
}

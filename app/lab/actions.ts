"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { endSession, requireLabAction } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { sendOffer } from "@/lib/services/lab-portal";
import { completeRequest } from "@/lib/services/loyalty";
import type { ActionState } from "@/components/ui/action-form";

export async function sendOfferAction(requestId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await requireLabAction();
    await sendOffer(s.laboratoryId, s.id, requestId, Object.fromEntries(fd));
    revalidatePath("/lab", "layout");
    return { ok: "Offer sent. The patient has been notified." };
  } catch (e) {
    if (e instanceof ZodError) return { error: e.issues[0]?.message ?? "Please check your offer." };
    if (e instanceof AppError) return { error: e.message };
    console.error(e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function labSignOutAction() {
  await endSession();
  redirect("/");
}

export async function completeRequestAction(requestId: string): Promise<{ ok: boolean; error?: string; coins?: number }> {
  try {
    const s = await requireLabAction();
    const r = await completeRequest(s.laboratoryId, s.id, requestId);
    revalidatePath("/lab", "layout");
    return { ok: true, coins: r.coins };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { endSession, requirePatientAction } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { acceptOffer, cancelRequest, createRequest } from "@/lib/services/requests";
import { submitReview } from "@/lib/services/loyalty";
import { updatePatientProfile } from "@/lib/services/accounts";
import type { ActionState } from "@/components/ui/action-form";

function message(e: unknown): string {
  if (e instanceof ZodError) return e.issues[0]?.message ?? "Please check the form.";
  if (e instanceof AppError) return e.message;
  console.error(e);
  return "Something went wrong. Please try again.";
}

export type RequestResult = { ok: true; id: string; labsNotified: number } | { ok: false; error: string };

export async function createRequestAction(input: unknown): Promise<RequestResult> {
  try {
    const s = await requirePatientAction();
    const r = await createRequest(s.id, input);
    revalidatePath("/app", "layout");
    return { ok: true, id: r.id, labsNotified: r.labsNotified };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function cancelRequestAction(requestId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await requirePatientAction();
    await cancelRequest(s.id, requestId);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function acceptOfferAction(offerId: string): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  try {
    const s = await requirePatientAction();
    const r = await acceptOffer(s.id, offerId);
    revalidatePath("/app", "layout");
    return { ok: true, requestId: r.requestId };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function submitReviewAction(requestId: string, input: { rating: number; comment: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await requirePatientAction();
    await submitReview(s.id, requestId, input);
    revalidatePath("/app", "layout");
    revalidatePath("/labs", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await requirePatientAction();
    await updatePatientProfile(s.id, Object.fromEntries(fd));
    revalidatePath("/app", "layout");
    return { ok: "Profile saved." };
  } catch (e) { return { error: message(e) }; }
}

export async function patientSignOutAction() {
  await endSession();
  redirect("/");
}

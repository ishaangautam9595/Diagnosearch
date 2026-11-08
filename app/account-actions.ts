"use server";
import { getSession } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { changeOwnPassword } from "@/lib/services/accounts";
import type { ActionState } from "@/components/ui/action-form";

/** Change-password for any signed-in user (patient, lab owner or admin). */
export async function changeOwnPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await getSession();
    if (!s) throw new AppError("You must be signed in.", "UNAUTHORIZED");
    if (fd.get("next") !== fd.get("confirm")) throw new AppError("The new passwords don't match.");
    await changeOwnPassword(s.id, String(fd.get("current") ?? ""), String(fd.get("next") ?? ""));
    return { ok: "Password changed." };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    console.error(e);
    return { error: "Something went wrong. Please try again." };
  }
}

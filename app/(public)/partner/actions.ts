"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { submitPartnerApplication } from "@/lib/services/partner";
import { AppError } from "@/lib/errors";
import type { ActionState } from "@/components/ui/action-form";

export async function submitPartnerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  try {
    await submitPartnerApplication({ ...Object.fromEntries(fd), consent: fd.get("consent") === "on" }, { ip });
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    console.error("partner application failed", e);
    return { error: "Something went wrong. Please try again." };
  }
  redirect("/partner/success");
}

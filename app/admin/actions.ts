"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, startSession } from "@/lib/auth";
import { verifyAdminCredentials } from "@/lib/services/admin";
import { AppError } from "@/lib/errors";
import type { ActionState } from "@/components/ui/action-form";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter your email and password." };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  try {
    const user = await verifyAdminCredentials(parsed.data.email, parsed.data.password, ip);
    await startSession(user.id, user.role);
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  redirect("/admin/dashboard");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

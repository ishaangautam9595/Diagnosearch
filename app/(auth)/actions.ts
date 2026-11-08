"use server";
import { headers } from "next/headers";
import { endSession, roleHome, startSession } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { loginWithPassword, signupPatient } from "@/lib/services/accounts";

export type AuthResult = { ok: true; redirectTo: string } | { ok: false; error: string };

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
function fail(e: unknown): AuthResult {
  if (e instanceof AppError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function loginAction(identifier: string, password: string): Promise<AuthResult> {
  try {
    const user = await loginWithPassword(identifier, password, { ip: await clientIp() });
    await startSession(user.id, user.role);
    return { ok: true, redirectTo: roleHome(user.role) };
  } catch (e) { return fail(e); }
}

export async function signupAction(input: unknown): Promise<AuthResult> {
  try {
    const user = await signupPatient(input);
    await startSession(user.id, user.role);
    return { ok: true, redirectTo: "/app" };
  } catch (e) { return fail(e); }
}

export async function signOutAction() {
  await endSession();
}

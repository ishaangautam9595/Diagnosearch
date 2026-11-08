"use server";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { ZodError } from "zod";
import { requireAdminAction } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import type { Role } from "@/generated/prisma/client";
import type { ActionState } from "@/components/ui/action-form";
import { laboratorySchema, testSchema } from "@/lib/validation/admin";
import * as cat from "@/lib/services/admin-catalogue";
import { audit } from "@/lib/services/admin";
import { adminResetPassword } from "@/lib/services/accounts";
import { db } from "@/lib/db";
import { reviewApplication } from "@/lib/services/partner";
import { CATALOGUE_TAG } from "@/lib/services/test-catalogue";

type Redirect = { redirectTo: string };
async function run(roles: Role[], fn: (adminId: string) => Promise<string | Redirect | void>): Promise<ActionState> {
  let target: string | undefined;
  try {
    const admin = await requireAdminAction(roles);
    const res = await fn(admin.id);
    revalidatePath("/admin", "layout"); // keep every admin view in sync after a change
    if (typeof res === "string") return { ok: res };
    if (res && "redirectTo" in res) target = res.redirectTo;
  } catch (e) {
    if (e instanceof ZodError) return { error: e.issues[0]?.message ?? "Please check the form." };
    if (e instanceof AppError) return { error: e.message };
    console.error(e);
    return { error: "Something went wrong. Please try again." };
  }
  if (target) redirect(target);
  return { ok: "Saved." };
}

const ADMIN: Role[] = ["ADMIN"];
const obj = (fd: FormData) => Object.fromEntries(fd) as Record<string, unknown>;
const refreshCatalogue = () => updateTag(CATALOGUE_TAG);

/* Laboratories */
export async function saveLaboratoryAction(id: string | null, _p: ActionState, fd: FormData) {
  return run(ADMIN, async (adminId) => {
    const input = laboratorySchema.parse(obj(fd));
    const lab = await cat.saveLaboratory(adminId, id, input);
    refreshCatalogue();
    return { redirectTo: `/admin/laboratories/${lab.id}?saved=1` };
  });
}
export async function toggleLaboratoryAction(id: string, active: boolean) {
  const res = await run(ADMIN, async (adminId) => { await cat.setLaboratoryActive(adminId, id, active); refreshCatalogue(); });
  if (res.error) throw new AppError(res.error);
}

/* Tests */
export async function saveTestAction(id: string | null, _p: ActionState, fd: FormData) {
  return run(ADMIN, async (adminId) => {
    const input = testSchema.parse(obj(fd));
    await cat.saveTest(adminId, id, input);
    refreshCatalogue();
    return { redirectTo: "/admin/tests?saved=1" };
  });
}
export async function deleteTestAction(id: string) {
  const res = await run(ADMIN, async (adminId) => { await cat.deleteOrDeactivateTest(adminId, id); refreshCatalogue(); });
  if (res.error) throw new AppError(res.error);
}

/* Categories & localities */
export async function saveCategoryAction(id: string | null, _p: ActionState, fd: FormData) {
  return run(ADMIN, async (adminId) => { await cat.saveCategory(adminId, id, obj(fd)); refreshCatalogue(); return id ? "Category saved." : "Category added."; });
}
/* Patients */
export async function setPatientActiveAction(userId: string, active: boolean) {
  const res = await run(["ADMIN"], async (adminId) => {
    await db.user.updateMany({ where: { id: userId, role: "PATIENT" }, data: { isActive: active } });
    await audit(adminId, active ? "patient.enabled" : "patient.disabled", "User", userId);
  });
  if (res.error) throw new AppError(res.error);
}

export async function resetPasswordAction(userId: string): Promise<{ temp?: string; error?: string }> {
  try {
    const admin = await requireAdminAction(["ADMIN"]);
    const r = await adminResetPassword(admin.id, userId);
    return { temp: r.temp };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    console.error(e);
    return { error: "Something went wrong." };
  }
}

/* Partner applications */
export async function reviewApplicationAction(labId: string, decision: "APPROVE" | "REJECT", _p: ActionState, fd: FormData) {
  return run(ADMIN, async (adminId) => {
    await reviewApplication(adminId, labId, decision, String(fd.get("reason") ?? ""));
    refreshCatalogue();
    return decision === "APPROVE" ? "Approved — the laboratory is now live. Verify it and its prices when ready." : "Application rejected.";
  });
}

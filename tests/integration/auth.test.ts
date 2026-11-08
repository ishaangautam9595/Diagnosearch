import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { seedFixture } from "../helpers/fixtures";

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (cookieJar.has(n) ? { name: n, value: cookieJar.get(n)! } : undefined),
    set: (n: string, v: string) => void cookieJar.set(n, v),
    delete: (n: string) => void cookieJar.delete(n),
  }),
}));
vi.mock("next/cache", () => ({ updateTag: () => {}, revalidatePath: () => {}, cacheLife: () => {}, cacheTag: () => {}, revalidateTag: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); } }));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

import { SESSION_COOKIE, createSessionToken, getSession, requireAdminAction, requireAdminPage, requireLabAction, requireLabPage, requirePatientAction, requirePatientPage, roleHome, startSession, verifySessionToken } from "@/lib/auth";
import { verifyAdminCredentials } from "@/lib/services/admin";
import { saveCategoryAction } from "@/app/admin/(panel)/actions";
import { createRequestAction, acceptOfferAction } from "@/app/app/actions";
import { sendOfferAction } from "@/app/lab/actions";
import { sendChatAction } from "@/app/chat-actions";

type Fx = Awaited<ReturnType<typeof seedFixture>>;
let fx: Fx;
beforeEach(async () => { fx = await seedFixture(); cookieJar.clear(); });

describe("admin password login", () => {
  it("accepts valid admin credentials and audits it", async () => {
    expect(await verifyAdminCredentials("ADMIN@test.dev", "Test@12345678", "9.9.9.9")).toMatchObject({ email: "admin@test.dev", role: "ADMIN" });
    expect(await db.auditLog.count({ where: { action: "auth.login" } })).toBe(1);
  });
  it("rejects wrong passwords, unknown users, inactive users and non-admin roles with one message", async () => {
    await db.user.update({ where: { id: fx.staff.id }, data: { isActive: false } });
    for (const [e, p] of [["admin@test.dev", "wrong-password"], ["nobody@test.dev", "Test@12345678"], ["staff@test.dev", "Test@12345678"], ["asha@test.dev", "anything"], ["near-lab@test.dev", "anything"]]) {
      await expect(verifyAdminCredentials(e, p, null)).rejects.toMatchObject({ code: "UNAUTHORIZED", message: "Invalid email or password." });
    }
  });
  it("rate limits repeated failed logins", async () => {
    for (let i = 0; i < 8; i++) await expect(verifyAdminCredentials("admin@test.dev", "bad", null)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(verifyAdminCredentials("admin@test.dev", "Test@12345678", null)).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});

describe("sessions", () => {
  it("round-trips a signed token and rejects tampered / foreign / expired / missing ones", async () => {
    const t = await createSessionToken(fx.admin.id, "ADMIN");
    expect(await verifySessionToken(t)).toEqual({ userId: fx.admin.id });
    expect(await verifySessionToken(t.slice(0, -2) + "xx")).toBeNull();
    const foreign = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(fx.admin.id).setExpirationTime("1h").sign(new TextEncoder().encode("another-secret-another-secret-another"));
    expect(await verifySessionToken(foreign)).toBeNull();
    const expired = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(fx.admin.id).setIssuedAt(1).setExpirationTime(2).sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
    expect(await verifySessionToken(expired)).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
  });
  it("takes the role from the database, not the token, and dies when the user is disabled", async () => {
    await startSession(fx.patient.id, "ADMIN"); // token claims ADMIN
    expect(await getSession()).toMatchObject({ id: fx.patient.id, role: "PATIENT" });
    await db.user.update({ where: { id: fx.patient.id }, data: { isActive: false } });
    expect(await getSession()).toBeNull();
  });
  it("sends each role to its own home", () => {
    expect([roleHome("PATIENT"), roleHome("LAB_OWNER"), roleHome("ADMIN"), roleHome("STAFF")]).toEqual(["/app", "/lab", "/admin/dashboard", "/admin/dashboard"]);
    expect(SESSION_COOKIE).toBe("ds_session");
  });
});

describe("role separation", () => {
  it("anonymous visitors are sent to the right sign-in page", async () => {
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/admin/login");
    await expect(requirePatientPage()).rejects.toThrow("REDIRECT:/login");
    await expect(requireLabPage()).rejects.toThrow("REDIRECT:/login");
    await expect(requireAdminAction()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("a patient cannot enter admin or lab areas (redirected home, no loops)", async () => {
    await startSession(fx.patient.id, "PATIENT");
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/app");
    await expect(requireLabPage()).rejects.toThrow("REDIRECT:/app");
    await expect(requirePatientPage()).resolves.toMatchObject({ role: "PATIENT" });
    await expect(requireAdminAction()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireLabAction()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("a lab owner cannot enter patient or admin areas and is bound to their own laboratory", async () => {
    await startSession(fx.near.owner.id, "LAB_OWNER");
    await expect(requirePatientPage()).rejects.toThrow("REDIRECT:/lab");
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/lab");
    await expect(requirePatientAction()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await requireLabAction()).laboratoryId).toBe(fx.near.lab.id);
  });
  it("staff may use shared admin areas but not admin-only ones", async () => {
    await startSession(fx.staff.id, "STAFF");
    await expect(requireAdminAction(["ADMIN"])).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireAdminPage(["ADMIN"])).rejects.toThrow("REDIRECT:/admin/dashboard");
    await expect(requireAdminAction()).resolves.toMatchObject({ role: "STAFF" });
  });
});

describe("server actions enforce roles and ownership", () => {
  it("admin actions refuse anonymous, patient, lab and staff callers; admins succeed with an audit entry", async () => {
    const fd = new FormData(); fd.set("name", "Sneaky"); fd.set("isActive", "on");
    expect(await saveCategoryAction(null, {}, fd)).toEqual({ error: "You must be signed in." });
    for (const u of [fx.patient, fx.near.owner, fx.staff]) {
      await startSession(u.id, u.role);
      expect(await saveCategoryAction(null, {}, fd)).toEqual({ error: "You don't have permission to do that." });
    }
    expect(await db.testCategory.count({ where: { name: "Sneaky" } })).toBe(0);
    await startSession(fx.admin.id, "ADMIN");
    expect((await saveCategoryAction(null, {}, fd)).error).toBeUndefined();
    expect(await db.auditLog.count({ where: { action: "category.created" } })).toBe(1);
  });
  it("patient actions refuse labs and anonymous callers", async () => {
    expect(await createRequestAction({ testIds: [fx.t1.id] })).toMatchObject({ ok: false });
    await startSession(fx.near.owner.id, "LAB_OWNER");
    expect(await createRequestAction({ testIds: [fx.t1.id] })).toMatchObject({ ok: false, error: expect.stringMatching(/permission/i) });
    await startSession(fx.patient.id, "PATIENT");
    expect(await createRequestAction({ testIds: [fx.t1.id] })).toMatchObject({ ok: true, labsNotified: 3 });
  });
  it("a lab can quote only requests it received; a patient can accept only their own offers; chat is scoped", async () => {
    await startSession(fx.patient.id, "PATIENT");
    const created = await createRequestAction({ testIds: [fx.t1.id] });
    if (!created.ok) throw new Error("setup");
    const fd = new FormData(); fd.set("totalPrice", "450"); fd.set("homeCollectionAvailable", "on");
    await startSession(fx.far.owner.id, "LAB_OWNER");
    expect(await sendOfferAction(created.id, {}, fd)).toMatchObject({ error: expect.any(String) });
    await startSession(fx.near.owner.id, "LAB_OWNER");
    expect(await sendOfferAction(created.id, {}, fd)).toMatchObject({ ok: expect.stringMatching(/offer sent/i) });
    expect(await sendChatAction(created.id, fx.near.lab.id, "Hi from lab")).toMatchObject({ ok: true });
    expect(await sendChatAction(created.id, fx.edge.lab.id, "not mine")).toMatchObject({ ok: false });
    const offer = await db.offer.findFirstOrThrow({ where: { requestId: created.id } });
    await startSession(fx.patient2.id, "PATIENT");
    expect(await acceptOfferAction(offer.id)).toMatchObject({ ok: false });
    await startSession(fx.patient.id, "PATIENT");
    expect(await acceptOfferAction(offer.id)).toMatchObject({ ok: true });
  });
});

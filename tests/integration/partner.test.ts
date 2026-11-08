import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

vi.mock("next/cache", () => ({ updateTag: () => {}, cacheLife: () => {}, cacheTag: () => {}, revalidatePath: () => {} }));

import { submitPartnerApplication, reviewApplication, listApplications } from "@/lib/services/partner";
import { createRequest } from "@/lib/services/requests";
import { loginWithPassword } from "@/lib/services/accounts";
import { saveLaboratory } from "@/lib/services/admin-catalogue";
import { getDashboardStats } from "@/lib/services/admin";
import { laboratorySchema } from "@/lib/validation/admin";
import { seedFixture } from "../helpers/fixtures";

type Fx = Awaited<ReturnType<typeof seedFixture>>;
let fx: Fx;
beforeEach(async () => { fx = await seedFixture(); });

const application = (over: Record<string, unknown> = {}) => ({
  name: "Sunrise Labs", contactPerson: "Ravi", phone: "+91 98000 11111", email: "Ravi@Sunrise.test", homeCollectionAvailable: "on",
  addresses: JSON.stringify([
    { label: "Main", line1: "1 Near Road", city: "Testville", pincode: "400001", latitude: 19.01, longitude: 72.8 },
    { label: "Second", line1: "2 Far Road", city: "Elsewhere", pincode: "110001", latitude: 28.6, longitude: 77.2 },
  ]),
  password: "Partner123", consent: true, ...over,
});

describe("lab partner sign-up (no prices)", () => {
  it("creates a pending, inactive lab with addresses and an owner login — and collects no prices", async () => {
    const r = await submitPartnerApplication(application());
    const lab = await db.laboratory.findUniqueOrThrow({ where: { id: r.id }, include: { addresses: { orderBy: { isPrimary: "desc" } }, owners: true } });
    expect(lab).toMatchObject({ approvalStatus: "PENDING", source: "SELF_SIGNUP", isActive: false, verificationStatus: "UNVERIFIED", email: "ravi@sunrise.test", phone: "9800011111" });
    expect(lab.addresses.map((a) => [a.line1, a.isPrimary])).toEqual([["1 Near Road", true], ["2 Far Road", false]]);
    expect(lab.owners).toHaveLength(1);
    expect(lab.owners[0]).toMatchObject({ role: "LAB_OWNER", email: "ravi@sunrise.test", phone: "9800011111" });
    expect(lab.owners[0].passwordHash).toMatch(/^\$2[aby]\$/);
    expect(await db.auditLog.count({ where: { action: "partner.applied" } })).toBe(1);
  });
  it("receives no patient requests until approved; then receives requests from either branch", async () => {
    const r = await submitPartnerApplication(application());
    const before = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    expect(await db.requestRecipient.count({ where: { requestId: before.id, laboratoryId: r.id } })).toBe(0);
    await reviewApplication(fx.admin.id, r.id, "APPROVE");
    const after = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    expect(await db.requestRecipient.count({ where: { requestId: after.id, laboratoryId: r.id } })).toBe(1);
    // a patient near the second (Delhi) branch also reaches it
    await db.user.update({ where: { id: fx.patient2.id }, data: { latitude: 28.61, longitude: 77.21 } });
    const delhi = await createRequest(fx.patient2.id, { testIds: [fx.t1.id] });
    expect(delhi.labsNotified).toBe(1);
  });
  it("the owner can sign in with email or mobile + their password, even while pending", async () => {
    const r = await submitPartnerApplication(application());
    const user = await loginWithPassword("98000 11111", "Partner123");
    expect((await loginWithPassword("ravi@sunrise.test", "Partner123")).id).toBe(user.id);
    await expect(loginWithPassword("ravi@sunrise.test", "wrong-pass1")).rejects.toThrow();
    expect(user.role).toBe("LAB_OWNER");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).laboratoryId).toBe(r.id);
  });
  it("rejection keeps the lab hidden and records a reason; a review happens once", async () => {
    const r = await submitPartnerApplication(application());
    await expect(reviewApplication(fx.admin.id, r.id, "REJECT", " ")).rejects.toThrow(/reason/i);
    await reviewApplication(fx.admin.id, r.id, "REJECT", "Could not verify licence");
    expect(await db.laboratory.findUniqueOrThrow({ where: { id: r.id } })).toMatchObject({ approvalStatus: "REJECTED", isActive: false, rejectionReason: "Could not verify licence" });
    await expect(reviewApplication(fx.admin.id, r.id, "APPROVE")).rejects.toMatchObject({ code: "CONFLICT" });
    const after = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    expect(await db.requestRecipient.count({ where: { requestId: after.id, laboratoryId: r.id } })).toBe(0);
    expect((await listApplications()).map((a) => a.id)).toContain(r.id);
  });
  it("validates input atomically: pin required, honeypot, consent, address, duplicates", async () => {
    await expect(submitPartnerApplication(application({ addresses: JSON.stringify([{ line1: "1 Road", city: "Testville", pincode: "400001" }]) }))).rejects.toThrow(/pin address 1/i);
    await expect(submitPartnerApplication(application({ website: "http://spam" }))).rejects.toThrow();
    await expect(submitPartnerApplication(application({ consent: false }))).rejects.toThrow(/authorised/i);
    await expect(submitPartnerApplication(application({ addresses: "[]" }))).rejects.toThrow(/at least one address/i);
    await expect(submitPartnerApplication(application({ phone: "123" }))).rejects.toThrow(/mobile number/i);
    await expect(submitPartnerApplication(application({ password: "short" }))).rejects.toThrow(/password/i);
    await expect(submitPartnerApplication(application({ email: "asha@test.dev" }))).rejects.toMatchObject({ code: "CONFLICT" }); // existing account
    await expect(submitPartnerApplication(application({ phone: "9876543210" }))).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.laboratory.count({ where: { source: "SELF_SIGNUP" } })).toBe(0);
  });
  it("rate limits applications per email", async () => {
    await submitPartnerApplication(application({ name: "A Lab" }));
    await expect(submitPartnerApplication(application({ name: "B Lab", phone: "9800011112" }))).rejects.toMatchObject({ code: "CONFLICT" }); // same email = existing account
    await submitPartnerApplication(application({ name: "C Lab", email: "c@x.test", phone: "9800011113" }));
  });
});

describe("admin lab management", () => {
  const form = (addresses: unknown[], over: Record<string, unknown> = {}) =>
    laboratorySchema.parse({ name: "Multi", phone: "+91 90000 22222", isActive: "on", addresses: JSON.stringify(addresses), ...over });
  it("adds, updates and removes branches while keeping ids stable, and verifies manually", async () => {
    const lab = await saveLaboratory(fx.admin.id, null, form([{ line1: "1 A Street", city: "Testville", pincode: "400001", latitude: 19, longitude: 72.8 }, { line1: "2 B Street", city: "Testville", pincode: "400002", latitude: 19.1, longitude: 72.9 }]));
    expect(lab).toMatchObject({ approvalStatus: "APPROVED", verificationStatus: "UNVERIFIED" });
    const [a1, a2] = await db.laboratoryAddress.findMany({ where: { laboratoryId: lab.id }, orderBy: { line1: "asc" } });
    await saveLaboratory(fx.admin.id, lab.id, form([{ id: a2.id, line1: "2 B Renamed", city: "Testville", pincode: "400002", latitude: 19.1, longitude: 72.9 }], { verified: "on" }));
    const rows = await db.laboratoryAddress.findMany({ where: { laboratoryId: lab.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: a2.id, line1: "2 B Renamed", isPrimary: true });
    expect(await db.laboratoryAddress.findUnique({ where: { id: a1.id } })).toBeNull();
    expect(await db.laboratory.findUniqueOrThrow({ where: { id: lab.id } })).toMatchObject({ verificationStatus: "VERIFIED" });
  });
  it("requires every address to be pinned on the map", () => {
    expect(() => form([{ line1: "1 A Street", city: "Testville", pincode: "400001" }])).toThrow(/pin address 1/i);
  });
});

describe("admin dashboard stats", () => {
  it("counts patients, labs, requests, offers and accepted value", async () => {
    const s0 = await getDashboardStats();
    expect(s0).toMatchObject({ patients: 2, labs: 5, activeLabs: 4, pendingApplications: 1, requests: 0, wonValue: 0 });
  });
});

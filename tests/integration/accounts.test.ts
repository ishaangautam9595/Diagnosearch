import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { adminResetPassword, changeOwnPassword, generateTempPassword, loginWithPassword, signupPatient, updatePatientProfile } from "@/lib/services/accounts";
import { passwordSchema } from "@/lib/validation/account";
import { seedFixture } from "../helpers/fixtures";

let fx: Awaited<ReturnType<typeof seedFixture>>;
beforeEach(async () => { fx = await seedFixture(); });

const addr = { addressLine: "7 New Street, Testville", city: "Testville", pincode: "400001", latitude: 19.01, longitude: 72.81 };

describe("password rules", () => {
  it("requires 8–72 characters with letters and a digit", () => {
    for (const bad of ["short1", "onlyletters", "12345678", "a".repeat(73) + "1", ""]) expect(passwordSchema.safeParse(bad).success).toBe(false);
    for (const good of ["abcdefg1", "Test@12345678", "x".repeat(70) + "12"]) expect(passwordSchema.safeParse(good).success).toBe(true);
  });
});

describe("patient accounts", () => {
  it("signs up with name, address and password (phone or email) and stores only a bcrypt hash", async () => {
    const u = await signupPatient({ name: "Meera Joshi", identifier: "98333 33333", password: "Secret123", ...addr });
    const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row).toMatchObject({ role: "PATIENT", phone: "9833333333", email: null, name: "Meera Joshi", latitude: 19.01 });
    expect(row.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(row.passwordHash).not.toContain("Secret123");
    const e = await signupPatient({ name: "Meera E", identifier: "Meera@Test.dev", password: "Secret123", ...addr });
    expect((await db.user.findUniqueOrThrow({ where: { id: e.id } })).email).toBe("meera@test.dev");
  });
  it("validates input and refuses duplicates", async () => {
    await expect(signupPatient({ name: "X Y", identifier: "9844444444", password: "weak", ...addr })).rejects.toThrow(/password/i);
    await expect(signupPatient({ name: "X Y", identifier: "9844444444", password: "Secret123", ...addr, latitude: undefined })).rejects.toThrow(/pin/i);
    await expect(signupPatient({ name: "X", identifier: "9844444444", password: "Secret123", ...addr })).rejects.toThrow(/name/i);
    await expect(signupPatient({ name: "Dup", identifier: "9876543210", password: "Secret123", ...addr })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(signupPatient({ name: "Dup", identifier: "ASHA@test.dev", password: "Secret123", ...addr })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.user.count({ where: { phone: "9844444444" } })).toBe(0);
  });
  it("updates the profile and validates the address", async () => {
    await updatePatientProfile(fx.patient.id, { name: "Asha V", ...addr });
    expect(await db.user.findUniqueOrThrow({ where: { id: fx.patient.id } })).toMatchObject({ name: "Asha V", addressLine: addr.addressLine });
    await expect(updatePatientProfile(fx.patient.id, { name: "A", ...addr })).rejects.toThrow();
  });
});

describe("sign-in with email or mobile + password", () => {
  it("signs in patients and lab owners by email or by mobile number", async () => {
    expect(await loginWithPassword("asha@test.dev", "Test@12345678")).toMatchObject({ id: fx.patient.id, role: "PATIENT" });
    expect(await loginWithPassword("98765 43210", "Test@12345678")).toMatchObject({ id: fx.patient.id });
    expect(await loginWithPassword("NEAR-LAB@test.dev", "Test@12345678")).toMatchObject({ role: "LAB_OWNER" });
    expect((await db.user.findUniqueOrThrow({ where: { id: fx.patient.id } })).lastLoginAt).not.toBeNull();
  });
  it("uses one message for wrong password, unknown account, disabled account and admin accounts", async () => {
    await db.user.update({ where: { id: fx.patient2.id }, data: { isActive: false } });
    for (const [id, pw] of [["asha@test.dev", "wrong-password1"], ["nobody@test.dev", "Test@12345678"], ["9876543211", "Test@12345678"], ["admin@test.dev", "Test@12345678"], ["staff@test.dev", "Test@12345678"]]) {
      await expect(loginWithPassword(id, pw)).rejects.toMatchObject({ code: "UNAUTHORIZED", message: "Incorrect mobile/email or password." });
    }
    await expect(loginWithPassword("not an id", "x")).rejects.toThrow();
  });
  it("rate limits repeated failures per account and per IP", async () => {
    for (let i = 0; i < 8; i++) await expect(loginWithPassword("asha@test.dev", "bad-password1")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(loginWithPassword("asha@test.dev", "Test@12345678")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    for (let i = 0; i < 40; i++) await loginWithPassword(`guess${i}@x.test`, "Test@12345678", { ip: "5.5.5.5" }).catch(() => {}); // different accounts, same IP
    await expect(loginWithPassword("edge-lab@test.dev", "Test@12345678", { ip: "5.5.5.5" })).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});

describe("changing and resetting passwords", () => {
  it("lets a user change their own password with the current one", async () => {
    await expect(changeOwnPassword(fx.patient.id, "wrong-current1", "NewPass123")).rejects.toThrow(/current password/i);
    await expect(changeOwnPassword(fx.patient.id, "Test@12345678", "weak")).rejects.toThrow(/password/i);
    await changeOwnPassword(fx.patient.id, "Test@12345678", "NewPass123");
    await expect(loginWithPassword("asha@test.dev", "Test@12345678")).rejects.toThrow();
    expect(await loginWithPassword("asha@test.dev", "NewPass123")).toMatchObject({ id: fx.patient.id });
    expect(await db.auditLog.count({ where: { action: "auth.password_changed" } })).toBe(1);
  });
  it("lets an admin issue a temporary password for patients and lab owners only", async () => {
    const r = await adminResetPassword(fx.admin.id, fx.patient.id);
    expect(r.temp).toMatch(/^[A-Za-z0-9]{11}$/);
    expect(/[A-Za-z]/.test(r.temp) && /\d/.test(r.temp)).toBe(true);
    expect(await loginWithPassword("asha@test.dev", r.temp)).toMatchObject({ id: fx.patient.id });
    await expect(loginWithPassword("asha@test.dev", "Test@12345678")).rejects.toThrow();
    expect((await adminResetPassword(fx.admin.id, fx.near.owner.id)).temp).not.toBe(r.temp);
    await expect(adminResetPassword(fx.admin.id, fx.staff.id)).rejects.toMatchObject({ code: "NOT_FOUND" }); // admin/staff can't be reset this way
    expect(await db.auditLog.count({ where: { action: "auth.password_reset_by_admin" } })).toBe(2);
    expect(await bcrypt.compare(generateTempPassword(), (await db.user.findUniqueOrThrow({ where: { id: fx.patient.id } })).passwordHash!)).toBe(false);
  });
});

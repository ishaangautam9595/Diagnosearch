import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { Prisma, type Role } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { audit } from "./admin";
import { parseIdentifier } from "@/lib/identifier";
import { passwordSchema, profileSchema, signupSchema } from "@/lib/validation/account";

const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO8eL1oXnmXn3kzK3b0m3i7pQeWnQK5Oa";
const BCRYPT_COST = 12;
export const hashPassword = (p: string) => bcrypt.hash(p, BCRYPT_COST);

const byIdentifier = (id: { type: "email" | "phone"; value: string }) => (id.type === "email" ? { email: id.value } : { phone: id.value });

/** Creates a patient account. The mobile number / email is not verified (no SMS or email gateway is used). */
export async function signupPatient(raw: unknown) {
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Please check the form.");
  const input = parsed.data;
  const id = parseIdentifier(input.identifier);
  if (await db.user.findUnique({ where: byIdentifier(id) })) {
    throw new AppError("An account with this number or email already exists. Please sign in instead.", "CONFLICT");
  }
  try {
    const user = await db.user.create({
      data: {
        name: input.name, role: "PATIENT", lastLoginAt: new Date(), passwordHash: await hashPassword(input.password),
        ...byIdentifier(id),
        addressLine: input.addressLine, city: input.city, pincode: input.pincode, latitude: input.latitude, longitude: input.longitude,
      },
    });
    await audit(user.id, "patient.signup", "User", user.id);
    return { id: user.id, role: user.role };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new AppError("An account with this number or email already exists.", "CONFLICT");
    throw e;
  }
}

/**
 * Email-or-mobile + password sign-in for patients and lab owners (admins use /admin/login).
 * Rate limited per account and per IP; the error never reveals whether the account exists.
 */
export async function loginWithPassword(identifier: string, password: string, meta: { ip?: string | null } = {}) {
  const id = parseIdentifier(identifier);
  await consumeRateLimit(`login:id:${id.value}`, 8, 15 * 60_000);
  if (meta.ip) await consumeRateLimit(`login:ip:${meta.ip}`, 40, 15 * 60_000);
  const user = await db.user.findUnique({ where: byIdentifier(id) });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  const allowed: Role[] = ["PATIENT", "LAB_OWNER"];
  if (!user || !user.isActive || !ok || !allowed.includes(user.role)) {
    await audit(user?.id ?? null, "auth.login_failed", "User", user?.id, { identifier: id.value });
    throw new AppError("Incorrect mobile/email or password.", "UNAUTHORIZED");
  }
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.id, "auth.login", "User", user.id);
  return { id: user.id, role: user.role };
}

export async function updatePatientProfile(userId: string, raw: unknown) {
  const input = profileSchema.parse(raw);
  await db.user.update({ where: { id: userId }, data: input });
}

/** Lets a signed-in user change their own password. */
export async function changeOwnPassword(userId: string, current: string, next: string) {
  await consumeRateLimit(`pwchange:${userId}`, 8, 15 * 60_000);
  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Choose a stronger password.");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) throw new AppError("Your current password is incorrect.");
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  await audit(userId, "auth.password_changed", "User", userId);
}

const TEMP_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export function generateTempPassword(): string {
  let s = "";
  for (let i = 0; i < 10; i++) s += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)];
  return `${s}7`; // always contains a letter and a digit
}

/**
 * There is no email/SMS channel for "forgot password", so an admin issues a temporary password
 * (shown once) and shares it with the person out-of-band. Admin accounts cannot be reset this way.
 */
export async function adminResetPassword(actorId: string, targetUserId: string) {
  const user = await db.user.findUnique({ where: { id: targetUserId } });
  if (!user || (user.role !== "PATIENT" && user.role !== "LAB_OWNER")) throw new AppError("Account not found.", "NOT_FOUND");
  const temp = generateTempPassword();
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(temp) } });
  await audit(actorId, "auth.password_reset_by_admin", "User", user.id);
  return { temp, who: user.email ?? user.phone ?? user.name };
}

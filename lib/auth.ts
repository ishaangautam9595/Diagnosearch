import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";

export const SESSION_COOKIE = "ds_session";
const SESSION_HOURS = 24 * 7;
export const ADMIN_ROLES: Role[] = ["ADMIN", "STAFF"];

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to a random string of 32+ characters");
  return new TextEncoder().encode(s);
}

export async function createSessionToken(userId: string, role: Role, hours = SESSION_HOURS) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(secret());
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.sub ? { userId: payload.sub } : null;
  } catch {
    return null;
  }
}

/** Admins get a shorter session than patients / labs. */
export async function startSession(userId: string, role: Role) {
  const hours = ADMIN_ROLES.includes(role) ? 8 : SESSION_HOURS;
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(userId, role, hours), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: hours * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export interface Session {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: Role;
  laboratoryId: string | null;
  // Patient profile (null for other roles)
  addressLine: string | null;
  city: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Authoritative check: signature + the user still exists and is active; the role comes from the DB. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const s = await verifySessionToken(token);
  if (!s) return null;
  const u = await db.user.findUnique({ where: { id: s.userId }, select: { id: true, email: true, phone: true, name: true, role: true, isActive: true, laboratoryId: true, addressLine: true, city: true, pincode: true, latitude: true, longitude: true } });
  if (!u || !u.isActive) return null;
  return { id: u.id, email: u.email, phone: u.phone, name: u.name, role: u.role, laboratoryId: u.laboratoryId, addressLine: u.addressLine, city: u.city, pincode: u.pincode, latitude: u.latitude, longitude: u.longitude };
});

/** Where each kind of user lands after signing in. */
export function roleHome(role: Role): string {
  return role === "PATIENT" ? "/app" : role === "LAB_OWNER" ? "/lab" : "/admin/dashboard";
}

/** For pages/layouts. Anonymous → that area's sign-in; signed in with the wrong role → their own home. */
export async function requireRolePage(roles: Role[], signIn: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(signIn);
  if (!roles.includes(session.role)) redirect(roleHome(session.role));
  return session;
}
export const requireAdminPage = (roles: Role[] = ADMIN_ROLES) => requireRolePage(roles, "/admin/login");
export const requirePatientPage = () => requireRolePage(["PATIENT"], "/login");
export const requireLabPage = () => requireRolePage(["LAB_OWNER"], "/login");

/** For server actions / route handlers: throws instead of redirecting. */
export async function requireRoleAction(roles: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AppError("You must be signed in.", "UNAUTHORIZED");
  if (!roles.includes(session.role)) throw new AppError("You don't have permission to do that.", "FORBIDDEN");
  return session;
}
export const requireAdminAction = (roles: Role[] = ADMIN_ROLES) => requireRoleAction(roles);
export const requirePatientAction = () => requireRoleAction(["PATIENT"]);
export async function requireLabAction(): Promise<Session & { laboratoryId: string }> {
  const s = await requireRoleAction(["LAB_OWNER"]);
  if (!s.laboratoryId) throw new AppError("No laboratory is linked to this account.", "FORBIDDEN");
  return s as Session & { laboratoryId: string };
}

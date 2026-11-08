import bcrypt from "bcryptjs";
import sharp from "sharp";
import { db } from "@/lib/db";

export async function resetDb() {
  await db.$transaction([
    db.chatMessage.deleteMany(), db.offer.deleteMany(), db.requestRecipient.deleteMany(), db.prescriptionImage.deleteMany(),
    db.requestTest.deleteMany(), db.testRequest.deleteMany(), db.laboratoryAddress.deleteMany(), db.user.deleteMany(),
    db.laboratory.deleteMany(), db.diagnosticTest.deleteMany(), db.testCategory.deleteMany(),
    db.rateLimitHit.deleteMany(), db.auditLog.deleteMany(), db.setting.deleteMany(),
  ]);
}

// Patient lives at (19.0, 72.8). 1° latitude ≈ 111 km.
export const PATIENT_LOC = { lat: 19.0, lng: 72.8 };

/**
 * - Near Lab   ≈ 3 km away, home collection
 * - Edge Lab   ≈ 18 km away (inside 20 km), no home collection
 * - Far Lab    ≈ 27 km away (outside)
 * - Branch Lab: far main branch, second branch ≈ 5 km away (counts via the nearer branch)
 * - Pending Lab / Inactive Lab: nearby but not approved / not active
 */
export async function seedFixture() {
  await resetDb();
  const cat = await db.testCategory.create({ data: { name: "Blood Tests", slug: "blood-tests" } });
  const t1 = await db.diagnosticTest.create({ data: { name: "Complete Blood Count", slug: "cbc", categoryId: cat.id } });
  const t2 = await db.diagnosticTest.create({ data: { name: "Hemoglobin", slug: "hemoglobin", categoryId: cat.id } });
  const inactiveTest = await db.diagnosticTest.create({ data: { name: "Hidden Test", slug: "hidden", categoryId: cat.id, isActive: false } });

  const passwordHash = await bcrypt.hash("Test@12345678", 4);
  const mkLab = async (name: string, branches: [number, number][], o: { home?: boolean; active?: boolean; approval?: "APPROVED" | "PENDING" | "REJECTED" } = {}) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const lab = await db.laboratory.create({
      data: {
        name, slug, phone: "9000000000", email: `${slug}@test.dev`, homeCollectionAvailable: o.home ?? false, isActive: o.active ?? true, approvalStatus: o.approval ?? "APPROVED",
        addresses: { create: branches.map(([lat, lng], i) => ({ line1: `${i + 1} Lab Road`, city: "Testville", pincode: "400001", latitude: lat, longitude: lng, isPrimary: i === 0 })) },
      },
    });
    const owner = await db.user.create({ data: { name: `${name} Owner`, role: "LAB_OWNER", email: `${slug}@test.dev`, phone: null, laboratoryId: lab.id, passwordHash } });
    return { lab, owner };
  };
  const near = await mkLab("Near Lab", [[19.027, 72.8]], { home: true });
  const edge = await mkLab("Edge Lab", [[19.162, 72.8]]);
  const far = await mkLab("Far Lab", [[19.243, 72.8]], { home: true });
  const branch = await mkLab("Branch Lab", [[19.5, 73.5], [19.045, 72.8]]);
  const pending = await mkLab("Pending Lab", [[19.01, 72.81]], { approval: "PENDING", active: false });
  const inactive = await mkLab("Inactive Lab", [[19.02, 72.79]], { active: false });

  const admin = await db.user.create({ data: { email: "admin@test.dev", name: "Admin", role: "ADMIN", passwordHash } });
  const staff = await db.user.create({ data: { email: "staff@test.dev", name: "Staff", role: "STAFF", passwordHash } });
  const patient = await db.user.create({
    data: { name: "Asha Verma", role: "PATIENT", passwordHash, phone: "9876543210", email: "asha@test.dev", addressLine: "12 Main Street", city: "Testville", pincode: "400001", latitude: PATIENT_LOC.lat, longitude: PATIENT_LOC.lng },
  });
  const patient2 = await db.user.create({
    data: { name: "Ravi Kumar", role: "PATIENT", passwordHash, phone: "9876543211", addressLine: "5 Side Street", city: "Testville", pincode: "400001", latitude: PATIENT_LOC.lat, longitude: PATIENT_LOC.lng },
  });
  return { cat, t1, t2, inactiveTest, near, edge, far, branch, pending, inactive, admin, staff, patient, patient2 };
}

export const actorOf = (u: { id: string; role: "ADMIN" | "STAFF" | "PATIENT" | "LAB_OWNER"; laboratoryId?: string | null }) => ({ id: u.id, role: u.role, laboratoryId: u.laboratoryId ?? null });

/** A real image of the given size (random noise so it doesn't compress to nothing). */
export async function makeImage(width: number, height: number, format: "png" | "jpeg" | "gif" = "jpeg") {
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919 + (i >> 5) * 31) & 255;
  const img = sharp(raw, { raw: { width, height, channels: 3 } });
  return format === "png" ? img.png().toBuffer() : format === "gif" ? img.gif().toBuffer() : img.jpeg({ quality: 95 }).toBuffer();
}

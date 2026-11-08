import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { audit } from "./admin";
import { syncAddresses } from "./address";
import type { LaboratoryInput, TestInput } from "@/lib/validation/admin";
import { categorySchema } from "@/lib/validation/admin";

async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const root = slugify(base) || "item";
  let slug = root;
  for (let i = 2; await exists(slug); i++) slug = `${root}-${i}`;
  return slug;
}

function rethrow(e: unknown, message: string): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new AppError(message, "CONFLICT");
  throw e;
}

/* ---------- Laboratories ---------- */
export async function saveLaboratory(actorId: string, id: string | null, input: LaboratoryInput) {
  return db.$transaction(async (tx) => {
    const prev = id ? await tx.laboratory.findUnique({ where: { id } }) : null;
    if (id && !prev) throw new AppError("Laboratory not found.", "NOT_FOUND");
    const verified = input.verified;
    const data = {
      name: input.name,
      description: input.description,
      phone: input.phone,
      whatsapp: input.whatsapp,
      email: input.email,
      openingHours: input.openingHours,
      accreditation: input.accreditation,
      isActive: input.isActive,
      homeCollectionAvailable: input.homeCollectionAvailable,
      verificationStatus: verified ? ("VERIFIED" as const) : ("UNVERIFIED" as const),
      verifiedAt: verified ? (prev?.verifiedAt ?? new Date()) : null,
    };
    const lab = prev
      ? await tx.laboratory.update({ where: { id: prev.id }, data })
      : await tx.laboratory.create({
          data: { ...data, slug: await uniqueSlug(input.name, async (s) => !!(await tx.laboratory.findUnique({ where: { slug: s } }))) },
        });

    await syncAddresses(tx, lab.id, input.addresses);

    await audit(actorId, prev ? "laboratory.updated" : "laboratory.created", "Laboratory", lab.id, {
      name: lab.name,
      ...(prev && prev.verificationStatus !== lab.verificationStatus ? { verification: lab.verificationStatus } : {}),
      ...(prev && prev.isActive !== lab.isActive ? { isActive: lab.isActive } : {}),
    }, tx);
    return lab;
  });
}

export async function setLaboratoryActive(actorId: string, id: string, isActive: boolean) {
  await db.$transaction(async (tx) => {
    await tx.laboratory.update({ where: { id }, data: { isActive } });
    await audit(actorId, isActive ? "laboratory.activated" : "laboratory.deactivated", "Laboratory", id, undefined, tx);
  });
}

/* ---------- Tests ---------- */
export async function saveTest(actorId: string, id: string | null, input: TestInput) {
  if (input.preparationVerified && !input.preparationInstructions) {
    throw new AppError("Add preparation instructions before marking them verified, or untick “verified”.");
  }
  return db.$transaction(async (tx) => {
    const prev = id ? await tx.diagnosticTest.findUnique({ where: { id } }) : null;
    if (id && !prev) throw new AppError("Test not found.", "NOT_FOUND");
    const prepChanged = prev && prev.preparationInstructions !== input.preparationInstructions;
    const data = {
      name: input.name,
      categoryId: input.categoryId,
      description: input.description,
      sampleType: input.sampleType,
      preparationInstructions: input.preparationInstructions,
      // Editing the text invalidates an earlier verification unless re-ticked.
      preparationVerifiedAt: input.preparationVerified
        ? (prev?.preparationVerifiedAt && !prepChanged ? prev.preparationVerifiedAt : new Date())
        : null,
      fastingRequirement: input.fastingRequirement,
      fastingHours: input.fastingRequirement === "REQUIRED" ? input.fastingHours : null,
      turnaroundHours: input.turnaroundHours,
      turnaroundNote: input.turnaroundNote,
      isPackage: input.isPackage,
      isActive: input.isActive,
    };
    try {
      const test = prev
        ? await tx.diagnosticTest.update({ where: { id: prev.id }, data })
        : await tx.diagnosticTest.create({
            data: { ...data, slug: await uniqueSlug(input.name, async (s) => !!(await tx.diagnosticTest.findUnique({ where: { slug: s } }))) },
          });
      await audit(actorId, prev ? "test.updated" : "test.created", "DiagnosticTest", test.id, { name: test.name }, tx);
      return test;
    } catch (e) {
      rethrow(e, "A test with this name already exists.");
    }
  });
}

/** Tests referenced by bookings are deactivated rather than deleted. */
export async function deleteOrDeactivateTest(actorId: string, id: string) {
  return db.$transaction(async (tx) => {
    const used = await tx.requestTest.count({ where: { testId: id } });
    if (used > 0) {
      await tx.diagnosticTest.update({ where: { id }, data: { isActive: false } });
      await audit(actorId, "test.deactivated", "DiagnosticTest", id, { reason: "has bookings" }, tx);
      return "deactivated" as const;
    }
    await tx.diagnosticTest.delete({ where: { id } });
    await audit(actorId, "test.deleted", "DiagnosticTest", id, undefined, tx);
    return "deleted" as const;
  });
}

/* ---------- Categories ---------- */
export async function saveCategory(actorId: string, id: string | null, raw: unknown) {
  const input = categorySchema.parse(raw);
  try {
    const cat = id
      ? await db.testCategory.update({ where: { id }, data: input })
      : await db.testCategory.create({ data: { ...input, slug: await uniqueSlug(input.name, async (s) => !!(await db.testCategory.findUnique({ where: { slug: s } }))) } });
    await audit(actorId, id ? "category.updated" : "category.created", "TestCategory", cat.id, { name: cat.name });
    return cat;
  } catch (e) {
    rethrow(e, "A category with this name already exists.");
  }
}


import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { slugify } from "@/lib/utils";
import { audit } from "./admin";
import { syncAddresses } from "./address";
import { partnerSchema } from "@/lib/validation/partner";
import { hashPassword } from "./accounts";

/**
 * Public lab sign-up. Creates an INACTIVE, UNVERIFIED, PENDING laboratory plus the owner's login account (email/mobile + password).
 * The lab receives no patient requests until an admin approves it. No prices are collected: labs quote per request.
 */
export async function submitPartnerApplication(raw: unknown, meta: { ip?: string | null } = {}) {
  const parsed = partnerSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Please check the form.");
  const input = parsed.data;
  if (input.website) throw new AppError("Could not submit the application."); // honeypot

  if (meta.ip) await consumeRateLimit(`partner:ip:${meta.ip}`, 3, 60 * 60_000);
  const email = input.email.toLowerCase();
  await consumeRateLimit(`partner:email:${email}`, 2, 24 * 60 * 60_000);

  const clash = await db.user.findFirst({ where: { OR: [{ email }, { phone: input.phone }] }, select: { id: true } });
  if (clash) throw new AppError("An account with this email or phone number already exists. Sign in instead.", "CONFLICT");

  const passwordHash = await hashPassword(input.password);
  try {
    return await db.$transaction(async (tx) => {
      let slug = slugify(input.name) || "lab";
      for (let i = 2; await tx.laboratory.findUnique({ where: { slug } }); i++) slug = `${slugify(input.name)}-${i}`;
      const lab = await tx.laboratory.create({
        data: {
          slug, name: input.name, contactPerson: input.contactPerson, phone: input.phone, whatsapp: input.whatsapp, email,
          description: input.description, openingHours: input.openingHours, accreditation: input.accreditation,
          homeCollectionAvailable: input.homeCollectionAvailable,
          isActive: false, verificationStatus: "UNVERIFIED", approvalStatus: "PENDING", source: "SELF_SIGNUP",
        },
      });
      await syncAddresses(tx, lab.id, input.addresses);
      await tx.user.create({ data: { name: input.contactPerson, role: "LAB_OWNER", email, phone: input.phone, laboratoryId: lab.id, passwordHash } });
      await audit(null, "partner.applied", "Laboratory", lab.id, { name: lab.name, addresses: input.addresses.length }, tx);
      return { id: lab.id, name: lab.name };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new AppError("An account with this email or phone number already exists.", "CONFLICT");
    throw e;
  }
}

export async function listApplications() {
  return db.laboratory.findMany({
    where: { source: "SELF_SIGNUP" },
    orderBy: [{ createdAt: "desc" }],
    include: { addresses: { orderBy: { isPrimary: "desc" } } },
  });
}

export function countPendingApplications() {
  return db.laboratory.count({ where: { approvalStatus: "PENDING" } });
}

export async function reviewApplication(actorId: string, labId: string, decision: "APPROVE" | "REJECT", reason?: string) {
  const lab = await db.laboratory.findUnique({ where: { id: labId } });
  if (!lab) throw new AppError("Application not found.", "NOT_FOUND");
  if (lab.approvalStatus !== "PENDING") throw new AppError("This application has already been reviewed.", "CONFLICT");
  if (decision === "REJECT" && !reason?.trim()) throw new AppError("Add a short reason for rejecting.");
  await db.$transaction(async (tx) => {
    await tx.laboratory.update({
      where: { id: labId },
      data: decision === "APPROVE"
        ? { approvalStatus: "APPROVED", isActive: true, reviewedAt: new Date(), rejectionReason: null }
        : { approvalStatus: "REJECTED", isActive: false, reviewedAt: new Date(), rejectionReason: reason!.trim() },
    });
    await audit(actorId, decision === "APPROVE" ? "partner.approved" : "partner.rejected", "Laboratory", labId, reason ? { reason } : undefined, tx);
  });
}

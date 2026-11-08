import { z } from "zod";

import { addressesField } from "./address";
import { phoneSchema } from "./phone";

const optionalText = (max = 500) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.number().int().min(0).max(100_000).nullable(),
);
const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const laboratorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optionalText(1000),
  phone: z.string().trim().min(5, "Enter a phone number").max(20),
  whatsapp: optionalText(20),
  email: z.string().trim().email().optional().or(z.literal("")).transform((v) => v || null),
  openingHours: optionalText(300),
  accreditation: optionalText(300),
  homeCollectionAvailable: bool,
  isActive: bool,
  verified: bool,
  addresses: addressesField({ requirePin: true }),
});
export type LaboratoryInput = z.infer<typeof laboratorySchema>;

export const testSchema = z.object({
  name: z.string().trim().min(2).max(160),
  categoryId: z.string().uuid("Choose a category"),
  description: optionalText(2000),
  sampleType: optionalText(80),
  preparationInstructions: optionalText(2000),
  preparationVerified: bool,
  fastingRequirement: z.enum(["UNKNOWN", "REQUIRED", "NOT_REQUIRED"]),
  fastingHours: optionalInt,
  turnaroundHours: optionalInt,
  turnaroundNote: optionalText(200),
  isPackage: bool,
  isActive: bool,
});
export type TestInput = z.infer<typeof testSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: optionalText(300),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: bool,
});

export { phoneSchema };

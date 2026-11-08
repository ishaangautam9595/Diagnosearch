import { z } from "zod";

/** bcrypt only uses the first 72 bytes, so longer passwords are refused rather than silently truncated. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Use letters and at least one number");

/** Patient address. A map pin (latitude/longitude) is required so we can find labs within 20 km. */
export const patientAddressSchema = z.object({
  addressLine: z.string().trim().min(5, "Enter your full address").max(250),
  city: z.string().trim().min(2, "Enter your city").max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "PIN code must be 6 digits"),
  latitude: z.coerce.number({ error: "Pin your location on the map" }).min(-90).max(90),
  longitude: z.coerce.number({ error: "Pin your location on the map" }).min(-180).max(180),
});

export const signupSchema = patientAddressSchema.extend({
  name: z.string().trim().min(2, "Enter your name").max(80),
  identifier: z.string().trim().min(3, "Enter your mobile number or email"),
  password: passwordSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const profileSchema = patientAddressSchema.extend({ name: z.string().trim().min(2, "Enter your name").max(80) });

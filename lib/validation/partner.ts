import { z } from "zod";
import { addressesField } from "./address";
import { phoneSchema } from "./phone";
import { passwordSchema } from "./account";

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** Lab sign-up. Labs never enter prices here: they quote on each patient request. */
export const partnerSchema = z.object({
  name: z.string().trim().min(2, "Enter your laboratory's name").max(120),
  contactPerson: z.string().trim().min(2, "Enter a contact person").max(80),
  phone: phoneSchema,
  whatsapp: optText(20),
  email: z.string().trim().email("Enter a valid email so we can reach you"),
  description: optText(1000),
  openingHours: optText(300),
  accreditation: optText(300),
  homeCollectionAvailable: bool,
  password: passwordSchema,
  addresses: addressesField({ requirePin: true }),
  consent: z.literal(true, { error: "Please confirm you're authorised to register this laboratory" }),
  /** Honeypot: real users never fill this in. */
  website: z.string().max(0).optional(),
});
export type PartnerInput = z.infer<typeof partnerSchema>;

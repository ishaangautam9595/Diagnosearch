import { z } from "zod";

const optText = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => (v ? v : null));
const coord = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(min).max(max).nullable());

export const addressSchema = z.object({
  id: z.string().uuid().nullish().transform((v) => v ?? null),
  label: optText(60),
  line1: z.string().trim().min(3, "Enter the street address").max(200),
  line2: optText(200),
  city: z.string().trim().min(2, "Enter the city").max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "PIN code must be 6 digits"),
  latitude: coord(-90, 90),
  longitude: coord(-180, 180),
});
export type AddressInput = z.infer<typeof addressSchema>;

/** Addresses travel as one JSON field (`addresses`) because the form edits a dynamic list. */
export const addressesField = (opts: { requirePin: boolean } = { requirePin: true }) =>
  z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid address data." });
        return z.NEVER;
      }
    })
    .pipe(z.array(addressSchema).min(1, "Add at least one address").max(10, "You can add up to 10 addresses"))
    .superRefine((list, ctx) => {
      if (!opts.requirePin) return;
      list.forEach((a, i) => {
        if (a.latitude === null || a.longitude === null) ctx.addIssue({ code: "custom", message: `Pin address ${i + 1} on the map` });
      });
    });

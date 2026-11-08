import { AppError } from "@/lib/errors";
import { phoneSchema } from "@/lib/validation/phone";

export type Identifier = { type: "email" | "phone"; value: string };

/** Accepts an email address or an Indian mobile number and returns it in canonical form. */
export function parseIdentifier(raw: string): Identifier {
  const v = raw.trim();
  if (v.includes("@")) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.length > 120) throw new AppError("Enter a valid email address.");
    return { type: "email", value: v.toLowerCase() };
  }
  const p = phoneSchema.safeParse(v);
  if (!p.success) throw new AppError("Enter a valid email or 10-digit mobile number.");
  return { type: "phone", value: p.data };
}

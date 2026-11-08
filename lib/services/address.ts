import type { Tx } from "@/lib/db";
import type { AddressInput } from "@/lib/validation/address";

/** Replaces a lab's addresses with the submitted list (first one is primary). Existing ids are kept stable. */
export async function syncAddresses(tx: Tx, laboratoryId: string, list: AddressInput[]): Promise<void> {
  const existing = await tx.laboratoryAddress.findMany({ where: { laboratoryId }, select: { id: true } });
  const existingIds = new Set(existing.map((e) => e.id));
  const keep = new Set(list.filter((a) => a.id && existingIds.has(a.id)).map((a) => a.id as string));
  await tx.laboratoryAddress.deleteMany({ where: { laboratoryId, id: { notIn: [...keep] } } });
  for (const [i, a] of list.entries()) {
    const data = { label: a.label, line1: a.line1, line2: a.line2, city: a.city, pincode: a.pincode, latitude: a.latitude, longitude: a.longitude, isPrimary: i === 0 };
    if (a.id && keep.has(a.id)) await tx.laboratoryAddress.update({ where: { id: a.id }, data });
    else await tx.laboratoryAddress.create({ data: { ...data, laboratoryId } });
  }
}

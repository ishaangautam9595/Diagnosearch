import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { deleteObjects, objectStorageEnabled, putObject } from "@/lib/storage";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // raw upload limit (the browser compresses first)
export const MAX_IMAGES_PER_REQUEST = 4;
const MAX_DIMENSION = 1280;
const ALLOWED = new Set(["jpeg", "png", "webp"]);

/**
 * Re-encodes any accepted image to a small WebP: auto-rotated, EXIF/metadata stripped, max 1280px.
 * Re-encoding also guarantees the stored bytes are a real image (not a disguised file).
 */
export async function optimiseImage(input: Buffer) {
  if (input.length === 0 || input.length > MAX_UPLOAD_BYTES) throw new AppError("Image is too large (max 10 MB).");
  let meta;
  try {
    meta = await sharp(input, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new AppError("That file isn't a valid image. Please upload a JPG, PNG or WebP photo.");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new AppError("Please upload a JPG, PNG or WebP photo.");
  const { data, info } = await sharp(input, { limitInputPixels: 60_000_000 })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 66, effort: 5 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, bytes: data.length, mimeType: "image/webp" };
}

/** Stores an upload for a patient. It is attached to a request when the request is submitted. */
export async function storePendingImage(ownerId: string, input: Buffer) {
  await consumeRateLimit(`upload:${ownerId}`, 30, 60 * 60_000);
  const pending = await db.prescriptionImage.count({ where: { ownerId, requestId: null } });
  if (pending >= 8) throw new AppError("Too many unsent uploads. Remove some or submit your request first.");
  const img = await optimiseImage(input);
  const { data, ...meta } = img;
  let row;
  if (objectStorageEnabled) {
    const storageKey = `prescriptions/${ownerId}/${randomUUID()}.webp`;
    await putObject(storageKey, new Uint8Array(data), meta.mimeType);
    try {
      row = await db.prescriptionImage.create({ data: { ownerId, ...meta, storageKey }, select: { id: true, width: true, height: true, bytes: true } });
    } catch (e) {
      await deleteObjects([storageKey]);
      throw e;
    }
  } else {
    row = await db.prescriptionImage.create({ data: { ownerId, ...meta, data: new Uint8Array(data) }, select: { id: true, width: true, height: true, bytes: true } });
  }
  // opportunistic cleanup of abandoned uploads
  if (Math.random() < 0.05) {
    const where = { requestId: null, createdAt: { lt: new Date(Date.now() - 24 * 3600_000) } };
    const stale = await db.prescriptionImage.findMany({ where, select: { id: true, storageKey: true } });
    await db.prescriptionImage.deleteMany({ where: { id: { in: stale.map((i) => i.id) } } });
    await deleteObjects(stale.map((i) => i.storageKey));
  }
  return row;
}

export async function deletePendingImage(ownerId: string, id: string) {
  const img = await db.prescriptionImage.findFirst({ where: { id, ownerId, requestId: null }, select: { storageKey: true } });
  await db.prescriptionImage.deleteMany({ where: { id, ownerId, requestId: null } });
  await deleteObjects([img?.storageKey ?? null]);
}

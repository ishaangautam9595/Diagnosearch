import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Optional S3-compatible object storage (Supabase Storage, Cloudflare R2, Backblaze B2, ...) for prescription images.
 * When the STORAGE_* env vars are unset, images fall back to being stored in the database.
 */
const { STORAGE_ENDPOINT, STORAGE_REGION, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_BUCKET } = process.env;

export const objectStorageEnabled = Boolean(STORAGE_ENDPOINT && STORAGE_ACCESS_KEY_ID && STORAGE_SECRET_ACCESS_KEY && STORAGE_BUCKET);

let client: S3Client | undefined;
function s3() {
  client ??= new S3Client({
    region: STORAGE_REGION || "auto",
    endpoint: STORAGE_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: STORAGE_ACCESS_KEY_ID!, secretAccessKey: STORAGE_SECRET_ACCESS_KEY! },
  });
  return client;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await s3().send(new PutObjectCommand({ Bucket: STORAGE_BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key: string): Promise<Uint8Array | null> {
  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }));
    return res.Body ? await res.Body.transformToByteArray() : null;
  } catch (e) {
    if ((e as { name?: string }).name === "NoSuchKey") return null;
    throw e;
  }
}

/** Best-effort delete: a failure leaves an orphan object but never breaks the user's action. */
export async function deleteObjects(keys: (string | null)[]) {
  const Objects = keys.filter((k): k is string => !!k).map((Key) => ({ Key }));
  if (!objectStorageEnabled || Objects.length === 0) return;
  try {
    await s3().send(new DeleteObjectsCommand({ Bucket: STORAGE_BUCKET, Delete: { Objects } }));
  } catch (e) {
    console.error("Storage delete failed", e);
  }
}

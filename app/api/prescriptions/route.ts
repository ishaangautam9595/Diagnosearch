import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { MAX_UPLOAD_BYTES, storePendingImage } from "@/lib/services/prescriptions";

/** Patients upload a prescription photo; it is re-encoded to a small WebP before being stored. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PATIENT") return NextResponse.json({ error: "Please sign in as a patient." }, { status: 401 });
  try {
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_UPLOAD_BYTES + 100_000) throw new AppError("Image is too large (max 10 MB).");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("No file received.");
    const img = await storePendingImage(session.id, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json(img, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.code === "RATE_LIMITED" ? 429 : 400 });
    console.error("prescription upload failed", e);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

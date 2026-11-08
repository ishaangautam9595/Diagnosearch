import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canViewImage } from "@/lib/services/chat";
import { getObject } from "@/lib/storage";
import { deletePendingImage } from "@/lib/services/prescriptions";

const UUID = /^[0-9a-f-]{36}$/i;

/** Serves a prescription image only to the patient, the labs that received the request, and admins. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/prescriptions/[id]">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session || !UUID.test(id) || !(await canViewImage({ id: session.id, role: session.role, laboratoryId: session.laboratoryId }, id))) {
    return new NextResponse("Not found", { status: 404 });
  }
  const img = await db.prescriptionImage.findUnique({ where: { id }, select: { data: true, storageKey: true, mimeType: true } });
  const bytes = img ? (img.storageKey ? await getObject(img.storageKey) : img.data) : null;
  if (!img || !bytes) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": img.mimeType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}

/** Removes an upload that hasn't been attached to a request yet. */
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/prescriptions/[id]">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session || session.role !== "PATIENT" || !UUID.test(id)) return new NextResponse("Not found", { status: 404 });
  await deletePendingImage(session.id, id);
  return new NextResponse(null, { status: 204 });
}

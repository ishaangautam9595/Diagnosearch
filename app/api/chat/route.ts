import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { listMessages } from "@/lib/services/chat";

const UUID = /^[0-9a-f-]{36}$/i;

/** Polled by the chat UI every few seconds. `after` is an ISO timestamp of the newest message already shown. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const p = req.nextUrl.searchParams;
  const requestId = p.get("requestId") ?? "";
  const laboratoryId = p.get("laboratoryId") ?? "";
  if (!UUID.test(requestId) || !UUID.test(laboratoryId)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const afterRaw = p.get("after");
  const after = afterRaw && !Number.isNaN(Date.parse(afterRaw)) ? new Date(afterRaw) : undefined;
  try {
    const res = await listMessages({ id: session.id, role: session.role, laboratoryId: session.laboratoryId }, requestId, laboratoryId, after);
    return NextResponse.json(res, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message, closed: true }, { status: 404 });
    throw e;
  }
}

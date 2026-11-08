import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getLabLiveCounts } from "@/lib/services/lab-portal";
import { getLabBranches, getLabEvents } from "@/lib/services/insights";

/**
 * Lab dashboard data. The laboratory always comes from the signed-in session — never from the query string —
 * so a lab can only ever read its own numbers.
 */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (s.role !== "LAB_OWNER" || !s.laboratoryId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [events, branches, live] = await Promise.all([getLabEvents(s.laboratoryId), getLabBranches(s.laboratoryId), getLabLiveCounts(s.laboratoryId)]);
  return NextResponse.json({ generatedAt: new Date().toISOString(), events, branches, ...live }, { headers: { "Cache-Control": "private, no-store" } });
}

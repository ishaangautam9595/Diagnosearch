import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPatientDashboard } from "@/lib/services/insights";

/** Patient dashboard data, scoped to the signed-in patient. */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (s.role !== "PATIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getPatientDashboard(s), { headers: { "Cache-Control": "private, no-store" } });
}

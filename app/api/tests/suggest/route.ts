import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { suggestTests } from "@/lib/services/test-catalogue";

export async function GET(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ items: [] }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ items: await suggestTests(q.slice(0, 60), 8) });
}

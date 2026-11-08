import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate only: sends visitors without a session cookie to the right sign-in page.
 * Real authorisation (signature, active user, role) is enforced server-side in lib/auth.ts
 * by every protected page, server action and API route.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!req.cookies.get("ds_session")?.value) {
    return NextResponse.redirect(new URL(pathname.startsWith("/admin") ? "/admin/login" : "/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/app/:path*", "/app", "/lab/:path*", "/lab"] };

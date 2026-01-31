import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ✅ nunca interceptar API
  if (path.startsWith("/api")) return NextResponse.next();

  // ✅ público
  if (path.startsWith("/login")) return NextResponse.next();

  // ✅ assets
  if (
    path.startsWith("/_next") ||
    path.startsWith("/icons") ||
    path.startsWith("/manifest") ||
    path === "/favicon.ico" ||
    path.startsWith("/sw")
  ) {
    return NextResponse.next();
  }

  const sid = req.cookies.get("ct_sid")?.value || "";
  if (!sid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

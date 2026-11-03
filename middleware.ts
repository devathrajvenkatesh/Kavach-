import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/agent",
  "/secure-files",
  "/executive-radar",
  "/analytics",
  "/audit",
  "/settings",
  "/admin",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionToken = req.cookies.get("kavach_session")?.value;
  if (!sessionToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agent/:path*",
    "/secure-files/:path*",
    "/executive-radar/:path*",
    "/analytics/:path*",
    "/audit/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/", "/login", "/auth/callback",
  "/terms", "/privacy", "/support", "/about", "/report",
  "/deactivate-account", "/delete-account", "/account-disabled",
]);

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/")) return true; // API handles DB checks itself
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const status = req.cookies.get("rv_account_status")?.value ?? "ACTIVE";
  if (status === "DEACTIVATED" || status === "DELETED") {
    const url = req.nextUrl.clone();
    url.pathname = "/account-disabled";
    url.searchParams.set("status", status);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};


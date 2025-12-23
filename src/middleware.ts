import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // If Supabase lands on "/" with ?code=..., forward to /auth/callback preserving querystring
  if (url.pathname === "/" && url.searchParams.has("code")) {
    const dest = new URL("/auth/callback", url.origin);
    dest.search = url.search; // preserve code + redirectTo if present
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};

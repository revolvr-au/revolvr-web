import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // If Supabase lands on "/" with ?code=..., forward to /auth/callback preserving querystring
  if (url.pathname === "/" && url.searchParams.has("code")) {
    const dest = new URL("/auth/callback", url.origin);
    dest.search = url.search; // keep code, redirectTo if present, etc.
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

// Run only on the root path (cheap + safe)
export const config = {
  matcher: ["/"],
};

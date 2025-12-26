import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const url = req.nextUrl.clone();

  // Force canonical domain for auth/session consistency (PKCE is origin-bound)
  if (host.endsWith(".vercel.app") && host !== "www.revolvr.net") {
    url.protocol = "https:";
    url.host = "www.revolvr.net";
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};

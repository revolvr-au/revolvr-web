import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const url = req.nextUrl.clone();

  const isLiveRoute = url.pathname.startsWith("/live");

  // Skip canonical redirect for live routes (prevents mobile bounce)
  if (
    !isLiveRoute &&
    host.endsWith(".vercel.app") &&
    host !== "www.revolvr.net"
  ) {
    url.protocol = "https:";
    url.host = "www.revolvr.net";
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
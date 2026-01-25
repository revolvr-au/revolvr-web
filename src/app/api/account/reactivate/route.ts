import { NextResponse } from "next/server";

export async function POST() {
  // TODO: Resolve current user from session/cookie.
  // TODO: Update DB: status=ACTIVE, reactivatedAt=now.
  // TODO: Record event.

  return NextResponse.json(
    { error: "Not implemented: wire authentication + DB update for reactivate endpoint." },
    { status: 501 }
  );
}

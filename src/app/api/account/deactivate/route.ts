import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  // TODO: Resolve current user from session/cookie (do NOT accept email from client).
  // TODO: Update DB: status=DEACTIVATED, deactivatedAt=now, reason/feedback persisted.
  // TODO: Invalidate session(s).

  return NextResponse.json(
    {
      error: "Not implemented: wire authentication + DB update for deactivate endpoint.",
      received: { reason: body?.reason ?? null },
    },
    { status: 501 }
  );
}

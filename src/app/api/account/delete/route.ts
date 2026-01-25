import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body?.ack) {
    return NextResponse.json({ error: "Acknowledgement required." }, { status: 400 });
  }

  // TODO: Resolve current user from session/cookie (do NOT accept email from client).
  // TODO: Update DB: status=DELETED, deletedAt=now, reason/feedback persisted.
  // TODO: Immediately prevent login + hide profile/content.
  // TODO: Invalidate session(s).

  return NextResponse.json(
    {
      error: "Not implemented: wire authentication + DB update for delete endpoint.",
      received: { reason: body?.reason ?? null },
    },
    { status: 501 }
  );
}

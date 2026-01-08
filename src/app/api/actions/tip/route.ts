import { NextResponse } from "next/server";

// ...keep your existing code...

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/actions/tip", method: "GET" });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      postId?: unknown;
      creatorEmail?: unknown;
      amountCents?: unknown;
    };

    const postId = typeof body.postId === "string" ? body.postId : "";
    const creatorEmail = typeof body.creatorEmail === "string" ? body.creatorEmail : "";
    const amountCents = typeof body.amountCents === "number" ? body.amountCents : NaN;

    if (!postId || !creatorEmail || !Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, tipId: "stub_tip_id" });
  } catch (e: unknown) {
    console.error("[tip] error", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

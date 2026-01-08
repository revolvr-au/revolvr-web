import { NextResponse } from "next/server";

// TODO tomorrow: import your auth + prisma:
// import { auth } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";

type Body = {
  postId?: unknown;
  creatorEmail?: unknown;
  amountCents?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const postId = typeof body.postId === "string" ? body.postId : "";
    const creatorEmail =
      typeof body.creatorEmail === "string" ? body.creatorEmail : "";
    const amountCents =
      typeof body.amountCents === "number" ? body.amountCents : NaN;

    if (!postId || !creatorEmail || !Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    // TODO tomorrow:
    // const session = await auth();
    // if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // TODO tomorrow: persist
    // const tip = await prisma.tip.create({ ... });

    return NextResponse.json({ ok: true, tipId: "stub_tip_id" });
  } catch (e: unknown) {
    console.error("[tip] error", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

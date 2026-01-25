import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailFromCreatorMe } from "@/lib/authedEmail";

export async function POST(req: Request) {
  const email = await getAuthedEmailFromCreatorMe(req);
  if (!email) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body?.ack) return NextResponse.json({ error: "Acknowledgement required." }, { status: 400 });

  const reason = String(body?.reason ?? "").slice(0, 64) || null;
  const feedback = String(body?.feedback ?? "").slice(0, 2000) || null;

  await prisma.accountState.upsert({
    where: { email },
    create: {
      email,
      status: "DELETED",
      deletedAt: new Date(),
      deletionReason: reason,
      deletionFeedback: feedback,
    },
    update: {
      status: "DELETED",
      deletedAt: new Date(),
      deletionReason: reason,
      deletionFeedback: feedback,
    },
  });

  await prisma.accountEvent.create({
    data: { email, type: "DELETE", reason, metadata: { feedback } as any },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("rv_account_status", "DELETED", { path: "/", sameSite: "lax" });
  return res;
}

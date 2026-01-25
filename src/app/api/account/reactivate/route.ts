import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailFromCreatorMe } from "@/lib/authedEmail";

export async function POST(req: Request) {
  const email = await getAuthedEmailFromCreatorMe(req);
  if (!email) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  await prisma.accountState.upsert({
    where: { email },
    create: { email, status: "ACTIVE", reactivatedAt: new Date() },
    update: { status: "ACTIVE", reactivatedAt: new Date() },
  });

  await prisma.accountEvent.create({
    data: { email, type: "REACTIVATE" },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("rv_account_status", "ACTIVE", { path: "/", sameSite: "lax" });
  return res;
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const email = await getAuthedEmailOrNull();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const avatarUrl =
    typeof body?.avatarUrl === "string" ? body.avatarUrl.trim() : null;
  if (!avatarUrl) {
    return NextResponse.json({ error: "Missing avatarUrl" }, { status: 400 });
  }

  // Update profiles.avatar_url (upsert in case row doesn't exist yet)
  await prisma.profiles.upsert({
    where: { email },
    update: { avatar_url: avatarUrl, updated_at: new Date() },
    create: { email, avatar_url: avatarUrl },
  });

  // Update CreatorProfile.avatarUrl if a creator record exists
  const creator = await prisma.creatorProfile.findUnique({
    where: { email },
    select: { id: true },
  });
  if (creator) {
    await prisma.creatorProfile.update({
      where: { email },
      data: { avatarUrl },
    });
  }

  return NextResponse.json({ ok: true });
}

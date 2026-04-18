import { NextRequest, NextResponse } from "next/server";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";

async function ensureStudioUser(email: string) {
  await prisma.studioUser.upsert({
    where: { email },
    update: {},
    create: { email, role: "ADMIN" },
  });
}

export async function POST(req: NextRequest) {
  const actorEmail = await getAuthedEmailOrNull();
  if (!isAdminEmail(actorEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subject, body, targetType, targetValue } = await req.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Missing subject or body" }, { status: 400 });
  }

  await prisma.broadcast.create({
    data: {
      subject,
      body,
      sentBy: actorEmail!,
      targetType: targetType ?? "all",
      targetValue: targetValue ?? null,
    },
  });

  await ensureStudioUser(actorEmail!);
  await prisma.studioAuditLog.create({
    data: {
      actorEmail: actorEmail!,
      action: "broadcast_sent",
      targetType: targetType ?? "all",
      targetId: targetValue ?? null,
      metadata: { subject, targetType },
    },
  });

  return NextResponse.json({ ok: true });
}

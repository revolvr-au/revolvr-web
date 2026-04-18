import { NextRequest, NextResponse } from "next/server";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";

const STATUS_MAP: Record<string, string> = {
  pause: "paused",
  ban: "banned",
  activate: "active",
};

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

  const { targetEmail, action } = await req.json();
  if (!targetEmail || !STATUS_MAP[action]) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.userStatus.upsert({
    where: { email: targetEmail },
    update: { status: STATUS_MAP[action], updatedBy: actorEmail },
    create: { email: targetEmail, status: STATUS_MAP[action], updatedBy: actorEmail },
  });

  await ensureStudioUser(actorEmail!);
  await prisma.studioAuditLog.create({
    data: {
      actorEmail: actorEmail!,
      action: `user_${action}`,
      targetType: "user",
      targetId: targetEmail,
    },
  });

  return NextResponse.json({ ok: true });
}

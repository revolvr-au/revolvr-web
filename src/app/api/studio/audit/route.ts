import { NextResponse } from "next/server";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const email = await getAuthedEmailOrNull();
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await prisma.studioAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      actorEmail: true,
      action: true,
      targetType: true,
      targetId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ logs });
}

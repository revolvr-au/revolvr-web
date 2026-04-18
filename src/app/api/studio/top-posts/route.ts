import { NextResponse } from "next/server";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const email = await getAuthedEmailOrNull();
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await prisma.creatorVoltageEvent.groupBy({
    by: ["targetId", "creatorEmail"],
    where: { targetType: "POST" },
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    take: 5,
  });

  const topPosts = results.map((r) => ({
    postId: r.targetId,
    creatorEmail: r.creatorEmail,
    totalPoints: r._sum.points ?? 0,
  }));

  return NextResponse.json({ topPosts });
}

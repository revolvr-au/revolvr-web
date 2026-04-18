import { NextResponse } from "next/server";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const email = await getAuthedEmailOrNull();
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [users, creators, posts, follows, recentPosts, recentEvents] =
    await Promise.all([
      prisma.profiles.count(),
      prisma.creatorProfile.count(),
      prisma.post.count(),
      prisma.follow.count(),
      prisma.post.count({ where: { createdAt: { gte: yesterday } } }),
      prisma.analyticsEvent.count({ where: { createdAt: { gte: yesterday } } }),
    ]);

  return NextResponse.json({ users, creators, posts, follows, recentPosts, recentEvents });
}

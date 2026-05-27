import { NextRequest, NextResponse } from "next/server";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const email = await getAuthedEmailOrNull();
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q") ?? "";

  const [profileResults, creatorResults] = await Promise.all([
    prisma.profiles.findMany({
      where: query ? { email: { contains: query, mode: "insensitive" } } : {},
      take: 20,
      select: { email: true, display_name: true },
    }),
    prisma.creatorProfile.findMany({
      where: query ? { email: { contains: query, mode: "insensitive" } } : {},
      take: 20,
      select: { email: true, displayName: true },
    }),
  ]);

  const emailSet = new Set<string>();
  const merged: { email: string; displayName: string | null; isCreator: boolean }[] = [];

  for (const p of profileResults) {
    if (!emailSet.has(p.email)) {
      emailSet.add(p.email);
      merged.push({
        email: p.email,
        displayName: p.display_name,
        isCreator: creatorResults.some((c) => c.email === p.email),
      });
    }
  }

  for (const c of creatorResults) {
    if (!emailSet.has(c.email)) {
      emailSet.add(c.email);
      merged.push({ email: c.email, displayName: c.displayName, isCreator: true });
    }
  }

  const statuses = await prisma.userStatus.findMany({
    where: { email: { in: [...emailSet] } },
  });
  const statusMap = Object.fromEntries(statuses.map((s) => [s.email, s.status]));

  const users = merged.map((u) => ({
    ...u,
    status: statusMap[u.email] ?? "active",
  }));

  return NextResponse.json({ users });
}

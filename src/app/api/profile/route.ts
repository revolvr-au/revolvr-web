import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function handleFromEmail(email: string) {
  const [local] = email.split("@");
  const cleaned = (local || "user").replace(/[^a-z0-9_]+/gi, "").slice(0, 30);
  return cleaned ? `@${cleaned}` : "@user";
}

function displayNameFromEmail(email: string) {
  const [local] = email.split("@");
  const cleaned = (local || "User").replace(/\W+/g, " ").trim();
  return cleaned || "User";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = normEmail(url.searchParams.get("email"));

    if (!email.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    // CreatorProfile model doesn't have userEmail (it has email/handle/etc).
    const creatorProfile =
      (await (prisma as any).creatorProfile?.findFirst?.({
        where: {
          OR: [{ email }, { handle: handleFromEmail(email).replace(/^@/, "") }, { handle: handleFromEmail(email) }],
        },
      }).catch(() => null)) ?? null;

    const creator =
      (await (prisma as any).creator?.findFirst?.({ where: { email } }).catch(() => null)) ?? null;

    const src = creatorProfile ?? creator ?? null;

    const profile = {
      email,
      displayName: String(src?.displayName ?? src?.name ?? displayNameFromEmail(email)),
      handle: String(src?.handle ?? handleFromEmail(email)),
      avatarUrl: String(src?.avatarUrl ?? src?.imageUrl ?? "").trim() || null,
      bio: String(src?.bio ?? "").trim() || null,
      verificationTier: src?.verificationTier ?? src?.blue_tick_status ?? src?.verificationStatus ?? null,
      isVerified:
        Boolean(src?.isVerified) ||
        src?.verificationTier === "blue" ||
        src?.verificationTier === "gold" ||
        src?.blue_tick_status === "blue" ||
        src?.blue_tick_status === "gold",
    };

    const posts =
      (await (prisma as any).post?.findMany?.({
        where: { userEmail: email },
        orderBy: { createdAt: "desc" },
        take: 60,
      }).catch(() => [])) ?? [];

    return NextResponse.json({ ok: true, profile, posts });
  } catch (e: any) {
    console.error("GET /api/profile error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

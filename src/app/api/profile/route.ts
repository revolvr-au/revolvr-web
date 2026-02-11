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
  return cleaned || "user";
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

    const handleBare = handleFromEmail(email);

    // CreatorProfile uses `email` (and optionally `handle`) — NOT userEmail.
    const creatorProfile =
      (await (prisma as any).creatorProfile?.findFirst?.({
        where: {
          OR: [{ email }, { handle: handleBare }, { handle: `@${handleBare}` }],
        },
      }).catch(() => null)) ?? null;

    // Optional legacy fallback if you still have a Creator table
    const creator =
      creatorProfile ??
      ((await (prisma as any).creator?.findFirst?.({ where: { email } }).catch(() => null)) ?? null);

    const profile = {
      email,
      displayName: String(creator?.displayName ?? creator?.name ?? displayNameFromEmail(email)),
      handle: String(creator?.handle ?? `@${handleBare}`),
      avatarUrl: String(creator?.avatarUrl ?? creator?.imageUrl ?? "").trim() || null,
      bio: String(creator?.bio ?? "").trim() || null,

      // keep these best-effort (your schema has a few variants)
      verificationTier: creator?.verificationTier ?? null,
      verificationStatus: creator?.verificationStatus ?? null,
      blue_tick_status: creator?.blue_tick_status ?? null,
      isVerified: Boolean(creator?.isVerified),
    };

    const posts =
      (await (prisma as any).post?.findMany?.({
        where: { userEmail: email },
        orderBy: { createdAt: "desc" },
        take: 60,
      }).catch(() => [])) ?? [];

    // Important: return ok:true even if creatorProfile is null so /u never “breaks”
    return NextResponse.json({ ok: true, profile, posts });
  } catch (e: any) {
    console.error("GET /api/profile error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

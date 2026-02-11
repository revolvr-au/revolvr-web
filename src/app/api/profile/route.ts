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

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    const handleGuess = handleFromEmail(email).replace(/^@/, "");

    // IMPORTANT: CreatorProfile does NOT have userEmail (your Prisma error confirms this).
    // Try by email first (case-insensitive), then handle (case-insensitive).
    const creatorProfile =
      (await (prisma as any).creatorProfile?.findFirst?.({
        where: {
          OR: [
            { email: { equals: email, mode: "insensitive" } },
            { handle: { equals: handleGuess, mode: "insensitive" } },
          ],
        },
      }).catch(() => null)) ?? null;

    // Optional fallback if you still have a Creator/User model in your DB.
    const creator =
      creatorProfile ??
      ((await (prisma as any).creator?.findFirst?.({
        where: { email: { equals: email, mode: "insensitive" } },
      }).catch(() => null)) ??
        null);

    const profile = {
      email,
      displayName: String(creator?.displayName ?? creator?.name ?? displayNameFromEmail(email)),
      handle: String(
        creator?.handle
          ? String(creator.handle).startsWith("@")
            ? String(creator.handle)
            : `@${creator.handle}`
          : handleFromEmail(email)
      ),
      avatarUrl: String(creator?.avatarUrl ?? creator?.imageUrl ?? "").trim() || null,
      bio: String(creator?.bio ?? "").trim() || null,
      verificationTier: creator?.verificationTier ?? null,
      isVerified:
        Boolean(creator?.isVerified) ||
        creator?.verificationTier === "blue" ||
        creator?.verificationTier === "gold",
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

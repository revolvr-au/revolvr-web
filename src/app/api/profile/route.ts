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

    // ✅ CreatorProfile uses `email` (unique)
    const cp =
      (await prisma.creatorProfile
        .findUnique({
          where: { email },
          select: {
            email: true,
            displayName: true,
            handle: true,
            bio: true,
            avatarUrl: true,
            isVerified: true,
            verificationStatus: true,
            verificationCurrentPeriodEnd: true,
            blue_tick_status: true,
            blue_tick_current_period_end: true,
          },
        })
        .catch(() => null)) ?? null;

    const profile = {
      email,
      displayName: String(cp?.displayName ?? displayNameFromEmail(email)),
      handle: String(cp?.handle ? (cp.handle.startsWith("@") ? cp.handle : `@${cp.handle}`) : handleFromEmail(email)),
      avatarUrl: cp?.avatarUrl?.trim() || null,
      bio: cp?.bio?.trim() || null,
      verificationTier: null, // you can map this later if needed
      verificationStatus: cp?.verificationStatus ?? null,
      blue_tick_status: cp?.blue_tick_status ?? null,
      isVerified: Boolean(cp?.isVerified),
    };

    const posts =
      (await prisma.post
        .findMany({
          where: { userEmail: email },
          orderBy: { createdAt: "desc" },
          take: 60,
        })
        .catch(() => [])) ?? [];

    return NextResponse.json({ ok: true, profile, posts });
  } catch (e: any) {
    console.error("GET /api/profile error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

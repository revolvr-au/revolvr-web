export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudioMod } from "@/lib/studioAuth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reviewerEmail = (searchParams.get("reviewerEmail") ?? "").trim().toLowerCase();

    if (!reviewerEmail) {
      return NextResponse.json(
        { ok: false, error: "reviewerEmail required" },
        { status: 400 },
      );
    }

    const guard = await requireStudioMod(reviewerEmail);
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const pending = await prisma.tFCMember.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        userEmail: true,
        languages: true,
        domains: true,
        motivation: true,
        createdAt: true,
      },
    });

    const emails = pending.map((p) => p.userEmail);
    const profiles =
      emails.length > 0
        ? await prisma.creatorProfile.findMany({
            where: { email: { in: emails } },
            select: { email: true, displayName: true, avatarUrl: true },
          })
        : [];
    const byEmail = new Map(profiles.map((p) => [p.email.toLowerCase(), p]));

    const applications = pending.map((p) => {
      const profile = byEmail.get(p.userEmail);
      return {
        email: p.userEmail,
        displayName: profile?.displayName ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        languages: p.languages,
        domains: p.domains,
        motivation: p.motivation ?? "",
        appliedAt: p.createdAt,
      };
    });

    return NextResponse.json({ ok: true, applications });
  } catch (error) {
    console.error("🔥 GET /api/tfc/applications ERROR:", error);
    return NextResponse.json({ ok: false, applications: [] }, { status: 500 });
  }
}

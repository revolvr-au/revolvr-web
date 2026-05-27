export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudioMod } from "@/lib/studioAuth";

const TERM_DAYS = 90;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const applicantEmail = String(body?.applicantEmail ?? "").trim().toLowerCase();
    const reviewerEmail = String(body?.reviewerEmail ?? "").trim().toLowerCase();

    if (!applicantEmail || !reviewerEmail) {
      return NextResponse.json(
        { ok: false, error: "applicantEmail and reviewerEmail required" },
        { status: 400 },
      );
    }

    const guard = await requireStudioMod(reviewerEmail);
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const existing = await prisma.tFCMember.findUnique({
      where: { userEmail: applicantEmail },
      select: { status: true },
    });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "application not found" },
        { status: 404 },
      );
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: `application is ${existing.status}, not PENDING` },
        { status: 409 },
      );
    }

    const now = new Date();
    const termEndsAt = new Date(now.getTime() + TERM_DAYS * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.tFCMember.update({
        where: { userEmail: applicantEmail },
        data: {
          status: "ACTIVE",
          termStartedAt: now,
          termEndsAt,
        },
      }),
      prisma.trancheNotification.create({
        data: {
          recipientEmail: applicantEmail,
          type: "TFC_APPROVED",
          metadata: { reviewerEmail, termEndsAt: termEndsAt.toISOString() },
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("🔥 POST /api/tfc/approve ERROR:", error);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, TFCVerdict } from "@prisma/client";

const ALLOWED_VERDICTS: TFCVerdict[] = [
  "TRUE",
  "FALSE",
  "MISLEADING",
  "UNVERIFIABLE",
  "SATIRE",
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const trancheEventId = String(body?.trancheEventId ?? "").trim();
    const commentId = String(body?.commentId ?? "").trim();
    const checkerEmail = String(body?.checkerEmail ?? "").trim().toLowerCase();
    const claim = String(body?.claim ?? "").trim();
    const verdictRaw = String(body?.verdict ?? "").trim().toUpperCase();
    const correctionRaw = typeof body?.correction === "string" ? body.correction.trim() : "";
    const sources = Array.isArray(body?.sources)
      ? (body.sources as unknown[])
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => /^https?:\/\//i.test(s))
      : [];

    if (!trancheEventId) {
      return NextResponse.json({ ok: false, error: "trancheEventId required" }, { status: 400 });
    }
    if (!commentId) {
      return NextResponse.json({ ok: false, error: "commentId required" }, { status: 400 });
    }
    if (!checkerEmail) {
      return NextResponse.json({ ok: false, error: "checkerEmail required" }, { status: 400 });
    }
    if (claim.length < 10) {
      return NextResponse.json({ ok: false, error: "claim too short" }, { status: 400 });
    }
    if (!ALLOWED_VERDICTS.includes(verdictRaw as TFCVerdict)) {
      return NextResponse.json({ ok: false, error: "invalid verdict" }, { status: 400 });
    }
    const verdict = verdictRaw as TFCVerdict;

    const checker = await prisma.tFCMember.findUnique({
      where: { userEmail: checkerEmail },
      select: { userEmail: true, status: true },
    });
    if (!checker || checker.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, error: "checker is not an active TFC member" },
        { status: 403 },
      );
    }

    const event = await prisma.trancheEvent.findUnique({
      where: { id: trancheEventId },
      select: {
        id: true,
        status: true,
        commentId: true,
        commentAuthorEmail: true,
        originalLanguage: true,
      },
    });
    if (!event) {
      return NextResponse.json({ ok: false, error: "tranche event not found" }, { status: 404 });
    }
    if (event.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, error: "tranche event is not active" },
        { status: 409 },
      );
    }
    if (event.commentId !== commentId) {
      return NextResponse.json(
        { ok: false, error: "commentId does not belong to this tranche event" },
        { status: 400 },
      );
    }

    const [factCheck] = await prisma.$transaction([
      prisma.tFCFactCheck.create({
        data: {
          trancheEventId,
          commentId,
          checkerEmail,
          claim: claim.slice(0, 2000),
          verdict,
          correction: correctionRaw ? correctionRaw.slice(0, 2000) : null,
          sources,
          language: event.originalLanguage ?? "en",
          status: "PENDING",
        },
        select: { id: true },
      }),
      prisma.tFCMember.update({
        where: { userEmail: checkerEmail },
        data: { totalChecks: { increment: 1 } },
      }),
      prisma.trancheNotification.create({
        data: {
          trancheEventId,
          recipientEmail: event.commentAuthorEmail,
          type: "TFC_FILED",
          metadata: {
            checkerEmail,
            verdict,
            claim: claim.slice(0, 280),
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, factCheckId: factCheck.id });
  } catch (error) {
    console.error("🔥 POST /api/tfc/file-check ERROR:", error);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}

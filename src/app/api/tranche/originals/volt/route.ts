export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VOLT_POINTS = 1;

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const postId = String(json?.postId ?? "").trim();
    const userEmail = String(json?.userEmail ?? "").trim().toLowerCase();

    if (!postId || !userEmail.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "invalid_input" },
        { status: 400 },
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json(
        { ok: false, error: "post_not_found" },
        { status: 404 },
      );
    }

    // One volt per user, deduped on insert. Mirrors tranche/volt-comment.
    const dedupeKey = `volt:${postId}:${userEmail}`;
    const event = await prisma.postVoltageEvent.upsert({
      where: { dedupeKey },
      update: {},
      create: { postId, actorEmail: userEmail, points: VOLT_POINTS, dedupeKey },
      select: { createdAt: true },
    });

    const isNew = Date.now() - new Date(event.createdAt).getTime() < 5_000;

    if (!isNew) {
      const current = await prisma.post.findUnique({
        where: { id: postId },
        select: { voltage: true },
      });
      return NextResponse.json({
        ok: true,
        voted: true,
        duplicate: true,
        newVoltage: current?.voltage ?? 0,
      });
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { voltage: { increment: VOLT_POINTS } },
      select: { voltage: true },
    });

    return NextResponse.json({
      ok: true,
      voted: true,
      duplicate: false,
      newVoltage: updated.voltage,
    });
  } catch (err: any) {
    console.error("tranche/originals/volt error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}

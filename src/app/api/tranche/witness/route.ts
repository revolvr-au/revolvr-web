export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EARLY_WITNESS_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const witnessEmail = String(body?.witnessEmail ?? "").trim().toLowerCase();
    const trancheEventId = String(body?.trancheEventId ?? "").trim();

    if (!witnessEmail.includes("@") || !trancheEventId) {
      return NextResponse.json(
        { ok: false, error: "invalid_input" },
        { status: 400 },
      );
    }

    const event = await prisma.trancheEvent.findUnique({
      where: { id: trancheEventId },
      select: {
        id: true,
        commentId: true,
        status: true,
        createdAt: true,
        comment: { select: { voltage: true, quietPeriodEndsAt: true } },
      },
    });

    if (!event) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 },
      );
    }

    if (event.status === "STRUCK_OUT" || event.status === "ARCHIVED") {
      return NextResponse.json(
        { ok: false, error: "event_inactive" },
        { status: 409 },
      );
    }

    const now = Date.now();
    const quietEnds = event.comment.quietPeriodEndsAt
      ? new Date(event.comment.quietPeriodEndsAt).getTime()
      : 0;
    if (quietEnds > now) {
      return NextResponse.json(
        {
          ok: false,
          error: "quiet_period_active",
          quietPeriodEndsAt: event.comment.quietPeriodEndsAt,
        },
        { status: 409 },
      );
    }

    try {
      await prisma.trancheWitness.create({
        data: {
          trancheEventId,
          commentId: event.commentId,
          witnessEmail,
          voltageAtWitness: event.comment.voltage,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        const updated = await prisma.trancheEvent.findUnique({
          where: { id: trancheEventId },
          select: { totalWitnesses: true },
        });
        return NextResponse.json({
          ok: true,
          witnessed: true,
          totalWitnesses: updated?.totalWitnesses ?? 0,
          duplicate: true,
        });
      }
      throw e;
    }

    const updated = await prisma.trancheEvent.update({
      where: { id: trancheEventId },
      data: { totalWitnesses: { increment: 1 } },
      select: { totalWitnesses: true },
    });

    const ageMs = now - new Date(event.createdAt).getTime();
    if (ageMs <= EARLY_WITNESS_WINDOW_MS) {
      await prisma.trancheNotification.create({
        data: {
          trancheEventId,
          recipientEmail: witnessEmail,
          type: "WITNESS_EARLY",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      witnessed: true,
      totalWitnesses: updated.totalWitnesses,
    });
  } catch (err: any) {
    console.error("tranche/witness error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}

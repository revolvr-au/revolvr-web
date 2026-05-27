export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardVoltage } from "@/lib/serverVoltage";

const VOLT_POINTS = 1;

async function getOrCreateConfig() {
  return prisma.trancheConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const actorEmail = String(body?.actorEmail ?? "").trim().toLowerCase();
    const commentId = String(body?.commentId ?? "").trim();

    if (!actorEmail.includes("@") || !commentId) {
      return NextResponse.json(
        { ok: false, error: "invalid_input" },
        { status: 400 },
      );
    }

    const commentExists = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!commentExists) {
      return NextResponse.json(
        { ok: false, error: "comment_not_found" },
        { status: 400 },
      );
    }

    const dedupeKey = `volt:${commentId}:${actorEmail}`;

    const created = await prisma.commentVoltageEvent.upsert({
      where: { dedupeKey },
      update: {},
      create: {
        commentId,
        actorEmail,
        points: VOLT_POINTS,
        eventType: "VOLT_RECEIVED",
        dedupeKey,
      },
      select: { id: true, createdAt: true },
    });

    const isNew =
      Date.now() - new Date(created.createdAt).getTime() < 5_000;

    if (!isNew) {
      const c = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { voltage: true, tranched: true, trancheEvent: { select: { id: true } } },
      });
      return NextResponse.json({
        ok: true,
        voted: true,
        newVoltage: c?.voltage ?? 0,
        tranched: !!c?.tranched,
        trancheEventId: c?.trancheEvent?.id,
        duplicate: true,
      });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { voltage: { increment: VOLT_POINTS } },
      select: {
        id: true,
        body: true,
        userEmail: true,
        postId: true,
        voltage: true,
        tranched: true,
        originalLanguage: true,
        createdAt: true,
        post: { select: { voltage: true, userEmail: true } },
      },
    });

    try {
      await awardVoltage({
        creatorEmail: updatedComment.userEmail,
        eventType: "comment_volted",
        actorEmail,
        targetType: "comment",
        targetId: updatedComment.id,
        dedupeKey: `volt-creator:${updatedComment.id}:${actorEmail}`,
      });
    } catch (e) {
      console.warn("tranche/volt-comment: awardVoltage skipped", e);
    }

    let tranched = updatedComment.tranched;
    let trancheEventId: string | undefined;

    if (!updatedComment.tranched) {
      const config = await getOrCreateConfig();
      const postVoltage = updatedComment.post?.voltage ?? 0;
      const share =
        postVoltage > 0 ? updatedComment.voltage / postVoltage : 0;

      const meetsFloor =
        updatedComment.voltage >= config.absoluteVoltageFloor;
      const meetsShare = share >= config.relativeVoltageShare;

      if (meetsFloor && meetsShare) {
        const timeToThresholdMs =
          Date.now() - new Date(updatedComment.createdAt).getTime();
        const quietEnds = new Date(
          Date.now() + config.quietPeriodSeconds * 1000,
        );

        const event = await prisma.trancheEvent.create({
          data: {
            commentId: updatedComment.id,
            postId: updatedComment.postId,
            commentAuthorEmail: updatedComment.userEmail,
            postCreatorEmail: updatedComment.post?.userEmail ?? "",
            breakoutVoltage: updatedComment.voltage,
            postVoltageAtBreakout: postVoltage,
            voltageSharePct: share,
            timeToThresholdMs,
            originalLanguage: updatedComment.originalLanguage,
            peakVoltage: updatedComment.voltage,
            totalVoltsSinceBreakout: 0,
          },
          select: { id: true },
        });

        await prisma.comment.update({
          where: { id: updatedComment.id },
          data: {
            tranched: true,
            tranchedAt: new Date(),
            quietPeriodEndsAt: quietEnds,
          },
        });

        await prisma.trancheNotification.createMany({
          data: [
            {
              trancheEventId: event.id,
              recipientEmail: updatedComment.userEmail,
              type: "BREAKOUT_AUTHOR",
            },
            {
              trancheEventId: event.id,
              recipientEmail: updatedComment.post?.userEmail ?? "",
              type: "BREAKOUT_CREATOR",
            },
          ],
        });

        tranched = true;
        trancheEventId = event.id;
      }
    }

    return NextResponse.json({
      ok: true,
      voted: true,
      newVoltage: updatedComment.voltage,
      tranched,
      trancheEventId,
    });
  } catch (err: any) {
    console.error("tranche/volt-comment error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}

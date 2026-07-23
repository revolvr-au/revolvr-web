export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const { id } = await Promise.resolve(params);

    const event = await prisma.trancheEvent.findUnique({
      where: { id },
      include: {
        comment: {
          select: {
            id: true,
            body: true,
            userEmail: true,
            voltage: true,
            createdAt: true,
            tranchedAt: true,
            quietPeriodEndsAt: true,
            originalLanguage: true,
          },
        },
        factChecks: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            checkerEmail: true,
            claim: true,
            verdict: true,
            correction: true,
            sources: true,
            language: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: { witnesses: true, factChecks: true, sinBinLogs: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 },
      );
    }

    const [contributors, authorProfile, post, recentWitnesses] = await Promise.all([
      prisma.commentVoltageEvent.groupBy({
        by: ["actorEmail"],
        where: { commentId: event.commentId },
        _sum: { points: true },
        orderBy: { _sum: { points: "desc" } },
        take: 3,
      }),
      prisma.creatorProfile.findUnique({
        where: { email: event.commentAuthorEmail },
        select: {
          email: true,
          displayName: true,
          handle: true,
          avatarUrl: true,
          ringTier: true,
        },
      }),
      prisma.post.findUnique({
        where: { id: event.postId },
        select: {
          id: true,
          caption: true,
          userEmail: true,
          imageUrl: true,
          voltage: true,
          deletedAt: true,
        },
      }),
      prisma.trancheWitness.findMany({
        where: { trancheEventId: id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { witnessEmail: true },
      }),
    ]);

    // A tranche event whose underlying post was soft-deleted no longer exists.
    if (post?.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 },
      );
    }

    const witnessEmails = recentWitnesses.map((w) => w.witnessEmail);
    const witnessProfiles = witnessEmails.length
      ? await prisma.creatorProfile.findMany({
          where: { email: { in: witnessEmails } },
          select: {
            email: true,
            displayName: true,
            handle: true,
            avatarUrl: true,
          },
        })
      : [];
    const witnessProfileByEmail = new Map(
      witnessProfiles.map((p) => [p.email, p]),
    );
    const topWitnesses = witnessEmails.map((email) => {
      const profile = witnessProfileByEmail.get(email) ?? null;
      return {
        email,
        displayName: profile?.displayName ?? null,
        handle: profile?.handle ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
      };
    });

    const contributorEmails = contributors.map((c) => c.actorEmail);
    const contributorProfiles = contributorEmails.length
      ? await prisma.creatorProfile.findMany({
          where: { email: { in: contributorEmails } },
          select: {
            email: true,
            displayName: true,
            handle: true,
            avatarUrl: true,
          },
        })
      : [];
    const profileByEmail = new Map(
      contributorProfiles.map((p) => [p.email, p]),
    );

    const now = Date.now();
    const sinBinActive =
      event.status === "SIN_BIN" &&
      !!event.sinBinExpiresAt &&
      new Date(event.sinBinExpiresAt).getTime() > now;

    return NextResponse.json({
      ok: true,
      event: {
        id: event.id,
        status: event.status,
        createdAt: event.createdAt,
        breakoutVoltage: event.breakoutVoltage,
        postVoltageAtBreakout: event.postVoltageAtBreakout,
        voltageSharePct: event.voltageSharePct,
        peakVoltage: event.peakVoltage,
        totalWitnesses: event.totalWitnesses,
        totalReplies: event.totalReplies,
        totalVoltsSinceBreakout: event.totalVoltsSinceBreakout,
        timeToThresholdMs: event.timeToThresholdMs,
        originalLanguage: event.originalLanguage,
        isSponsored: event.isSponsored,
        sponsorEmail: event.sponsorEmail,
        gathId: event.gathId,
        sinBin: {
          level: event.sinBinLevel,
          expiresAt: event.sinBinExpiresAt,
          active: sinBinActive,
          totalLogs: event._count.sinBinLogs,
        },
        struckOut: {
          at: event.struckOutAt,
          reason: event.struckOutReason,
        },
        comment: event.comment,
        author: authorProfile,
        post,
        topContributors: contributors.map((c) => ({
          email: c.actorEmail,
          points: c._sum.points ?? 0,
          profile: profileByEmail.get(c.actorEmail) ?? null,
        })),
        factChecks: event.factChecks,
        topWitnesses,
        counts: {
          witnesses: event._count.witnesses,
          factChecks: event._count.factChecks,
        },
      },
    });
  } catch (err: any) {
    console.error("tranche/event/[id] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}

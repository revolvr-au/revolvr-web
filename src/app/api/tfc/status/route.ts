export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PublicStatus = "none" | "pending" | "active" | "expired" | "suspended" | "professional";

const STATUS_MAP: Record<string, PublicStatus> = {
  PENDING: "pending",
  ACTIVE: "active",
  EXPIRED: "expired",
  SUSPENDED: "suspended",
  PROFESSIONAL: "professional",
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "email required" },
        { status: 400 },
      );
    }

    const member = await prisma.tFCMember.findUnique({
      where: { userEmail: email },
      select: {
        status: true,
        termEndsAt: true,
        accuracyScore: true,
        totalChecks: true,
      },
    });

    if (!member) {
      return NextResponse.json({
        ok: true,
        status: "none" as PublicStatus,
        termEndsAt: null,
        accuracyScore: null,
        totalChecks: 0,
      });
    }

    return NextResponse.json({
      ok: true,
      status: STATUS_MAP[member.status] ?? "none",
      termEndsAt: member.termEndsAt,
      accuracyScore: member.accuracyScore,
      totalChecks: member.totalChecks,
    });
  } catch (error) {
    console.error("🔥 GET /api/tfc/status ERROR:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

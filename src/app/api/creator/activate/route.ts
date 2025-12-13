import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = String(body?.email || "").trim().toLowerCase();
    const displayName = String(body?.displayName || "").trim();
    const handleRaw = body?.handle ? String(body.handle).trim() : "";
    const handle = handleRaw ? handleRaw.replace(/^@/, "") : null;

    if (!email || !displayName) {
      return NextResponse.json(
        { error: "Missing email or displayName" },
        { status: 400 }
      );
    }

    // Auto-approved on submit
    const profile = await prisma.creatorProfile.upsert({
      where: { email },
      update: {
        displayName,
        handle,
        payoutShare: 45,
        status: "ACTIVE",
      },
      create: {
        email,
        displayName,
        handle,
        payoutShare: 45,
        status: "ACTIVE",
      },
    });

    // Ensure balance row exists
    await prisma.creatorBalance.upsert({
      where: { creatorEmail: email },
      update: {},
      create: {
        creatorEmail: email,
        totalEarnedCents: 0,
        availableCents: 0,
      },
    });

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e) {
    console.error("[creator/activate] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

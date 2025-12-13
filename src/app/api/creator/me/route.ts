import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = String(searchParams.get("email") || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const profile = await prisma.creatorProfile.findUnique({ where: { email } });
    const balance = await prisma.creatorBalance.findUnique({
      where: { creatorEmail: email },
    });

    return NextResponse.json(
      {
        ok: true,
        profile,
        balance: balance ?? {
          creatorEmail: email,
          totalEarnedCents: 0,
          availableCents: 0,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[creator/me] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

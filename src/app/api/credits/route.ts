import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const credits = await prisma.userCredits.findUnique({
    where: { email },
  });

  return NextResponse.json(credits ?? { boosts: 0, tips: 0, spins: 0 });
}

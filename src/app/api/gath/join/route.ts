export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { gathId, userEmail } = await req.json();

    if (!gathId || !userEmail) {
      return NextResponse.json(
        { ok: false, error: "gathId and userEmail required" },
        { status: 400 },
      );
    }

    const gath = await prisma.gath.findUnique({ where: { id: gathId } });
    if (!gath) {
      return NextResponse.json(
        { ok: false, error: "gath not found" },
        { status: 404 },
      );
    }
    if (gath.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, error: "gath not active" },
        { status: 400 },
      );
    }

    const existing = await prisma.gathMember.findUnique({
      where: { gathId_userEmail: { gathId, userEmail } },
    });
    if (existing) {
      return NextResponse.json({ ok: true, member: existing, alreadyMember: true });
    }

    const member = await prisma.gathMember.create({
      data: { gathId, userEmail, role: "MEMBER" },
    });

    return NextResponse.json({ ok: true, member });
  } catch (err: any) {
    console.error("gath/join error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}

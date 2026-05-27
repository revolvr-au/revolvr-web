export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { gathId, userEmail, content } = await req.json();

    if (!gathId || !userEmail || !content) {
      return NextResponse.json(
        { ok: false, error: "gathId, userEmail and content required" },
        { status: 400 },
      );
    }

    const member = await prisma.gathMember.findUnique({
      where: { gathId_userEmail: { gathId, userEmail } },
    });
    if (!member) {
      return NextResponse.json(
        { ok: false, error: "not a member of this gath" },
        { status: 403 },
      );
    }

    const message = await prisma.gathMessage.create({
      data: {
        gathId,
        userEmail,
        content: String(content).slice(0, 1000),
      },
    });

    return NextResponse.json({ ok: true, message });
  } catch (err: any) {
    console.error("gath/message error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}

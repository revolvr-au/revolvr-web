export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      type,
      sparkCost,
      launchDate,
      creatorEmail,
      postId,
    } = body ?? {};

    if (!name || !creatorEmail) {
      return NextResponse.json(
        { ok: false, error: "name and creatorEmail required" },
        { status: 400 },
      );
    }

    const gathType =
      type === "PRIVATE" || type === "BUSINESS" || type === "OPEN"
        ? type
        : "OPEN";

    let cost = typeof sparkCost === "number" ? sparkCost : 0;
    if (gathType === "PRIVATE" && cost === 0) cost = 50;

    const status = launchDate ? "PRELAUNCHING" : "ACTIVE";

    const gath = await prisma.gath.create({
      data: {
        name: String(name).slice(0, 120),
        description: description ? String(description).slice(0, 500) : null,
        type: gathType,
        status,
        creatorEmail,
        sparkCost: cost,
        launchDate: launchDate ? new Date(launchDate) : null,
      },
    });

    await prisma.gathMember.create({
      data: {
        gathId: gath.id,
        userEmail: creatorEmail,
        role: "IGNITER",
      },
    });

    if (postId) {
      await prisma.gathPost.create({
        data: {
          gathId: gath.id,
          postId: String(postId),
        },
      });
    }

    return NextResponse.json({ ok: true, gath });
  } catch (err: any) {
    console.error("gath/create error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}

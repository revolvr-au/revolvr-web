export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const { id } = await Promise.resolve(params);

    const gath = await prisma.gath.findUnique({ where: { id } });
    if (!gath) {
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 },
      );
    }

    if (gath.status !== "PRELAUNCHING") {
      return NextResponse.json({ ok: true, gath });
    }

    if (!gath.launchDate || new Date(gath.launchDate).getTime() > Date.now()) {
      return NextResponse.json(
        { ok: false, error: "launch date not reached" },
        { status: 400 },
      );
    }

    const updated = await prisma.gath.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    return NextResponse.json({ ok: true, gath: updated });
  } catch (err: any) {
    console.error("gath/[id]/activate error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}

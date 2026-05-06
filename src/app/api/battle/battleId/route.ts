import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { battleId: string } }
) {
  try {
    const { battleId } = await params;
    const battle = await prisma.liveBattle.findUnique({ where: { id: battleId } });
    if (!battle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ battle });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        caption: true,
        media_url: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ posts }); // ✅ IMPORTANT
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed" },
      { status: 500 }
    );
  }
}
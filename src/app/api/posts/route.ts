import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET (already working)
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

    return NextResponse.json({ posts });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed" },
      { status: 500 }
    );
  }
}

// ✅ ADD THIS
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const post = await prisma.post.create({
      data: {
        caption: body.caption || "",
        media_url: body.media_url,
      },
    });

    return NextResponse.json({ post });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create post" },
      { status: 500 }
    );
  }
}
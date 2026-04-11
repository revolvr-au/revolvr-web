import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const formatted = posts.map((p) => ({
  id: p.id,
  caption: p.caption,
  imageUrl: p.imageUrl,
  userEmail: p.userEmail,
  handle: p.userEmail?.split("@")[0] ?? "user",
  createdAt: p.createdAt,
}));

    console.log("API OUTPUT:", formatted); // 🔍 debug

    return NextResponse.json({ posts: formatted });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
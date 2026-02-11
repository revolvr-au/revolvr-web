import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = String(url.searchParams.get("email") ?? "");
    const email = safeDecode(raw).trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    // CreatorProfile exists in your schema
    const profile = await (prisma as any).creatorProfile.findUnique({
      where: { userEmail: email },
    });

    // Pull a few recent posts (Post has userEmail in schema)
    const posts = await (prisma as any).post.findMany({
      where: { userEmail: email },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        caption: true,
        createdAt: true,
        imageUrl: true,
        media: true,
      },
    });

    return NextResponse.json({
      ok: true,
      email,
      profile: profile ?? null,
      posts: posts ?? [],
    });
  } catch (e: any) {
    console.error("GET /api/profile error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

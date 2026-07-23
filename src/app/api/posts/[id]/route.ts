import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/posts/[id] -> fetch a single post (legacy + media[])
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = String(rawId ?? "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    }

    const p = await prisma.post.findUnique({
      where: { id },
      include: {
        media: { orderBy: { order: "asc" } },
        _count: { select: { likes: true } },
      },
    });

    if (!p || p.deletedAt) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const creator = await prisma.creatorProfile.findUnique({
      where: { email: p.userEmail },
    });

    return NextResponse.json({
      id: p.id,
      userEmail: String(p.userEmail ?? "").trim().toLowerCase(),
      avatarUrl: creator?.avatarUrl ?? null,
      image_Url: (p as any).image_Url ?? null, // legacy
      media: (p as any).media ?? [],
      caption: p.caption ?? "",
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      likesCount: p._count.likes,
    });
  } catch (err: any) {
    console.error("GET /api/posts/[id] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load post" },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id] -> soft-delete a post (owner only).
// Sets deletedAt; the post becomes invisible to every read/action path.
// Media, likes, comments, and ledger rows are left intact but unreachable.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Auth first — never touch the DB for an unauthenticated caller.
    const authed = await getAuthedEmailOrNull();
    if (!authed) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const email = authed.trim().toLowerCase();

    const { id: rawId } = await params;
    const id = String(rawId ?? "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id },
      select: { userEmail: true, deletedAt: true },
    });

    if (!post) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Ownership: server-derived email vs. the post's author. Never trust the client.
    if (String(post.userEmail ?? "").trim().toLowerCase() !== email) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Idempotent — already deleted is a no-op success.
    if (post.deletedAt) {
      return NextResponse.json({ ok: true, alreadyDeleted: true });
    }

    await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/posts/[id] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to delete post" },
      { status: 500 }
    );
  }
}

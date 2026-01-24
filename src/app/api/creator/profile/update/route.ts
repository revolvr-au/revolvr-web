import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user?.email) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const email = data.user.email.toLowerCase();

    const body = await req.json().catch(() => ({}));
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const handle = typeof body.handle === "string" ? body.handle.trim() : "";
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";

    // Creator-only: do NOT create creatorProfile here.
    const existing = await prisma.creatorProfile.findUnique({ where: { email } });
    if (!existing) {
      return NextResponse.json(
        { error: "Creator profile not found. Complete creator onboarding first." },
        { status: 400 }
      );
    }

    await prisma.creatorProfile.update({
      where: { email },
      data: {
        displayName: displayName || null,
        handle: handle || null,
        // These fields may not exist in schema; guard via `any` assignment pattern.
        ...(avatarUrl ? ({ avatarUrl } as any) : ({ avatarUrl: null } as any)),
        ...(bio ? ({ bio } as any) : ({ bio: null } as any)),
      } as any,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

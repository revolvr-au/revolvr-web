import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMS_VERSION = "v1.0-2026-01-27";

async function getUserEmailFromBearer(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!apikey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const user = await res.json().catch(() => null);
  const email = user?.email ? String(user.email).trim().toLowerCase() : null;
  return email || null;
}

export async function POST(req: NextRequest) {
  try {
    const email = await getUserEmailFromBearer(req);
    if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    // Ensure creator exists
    const profile = await prisma.creatorProfile.findUnique({ where: { email } });
    if (!profile) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

    await prisma.creatorProfile.update({
      where: { email },
      data: {
        // these field names must match your Prisma model fields
        creatorTermsAccepted: true,
        creatorTermsAcceptedAt: new Date(),
        creatorTermsVersion: TERMS_VERSION,
      } as any,
    });

    return NextResponse.json({ ok: true, version: TERMS_VERSION }, { status: 200 });
  } catch (e: any) {
    console.error("[api/creator/terms/accept] error", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

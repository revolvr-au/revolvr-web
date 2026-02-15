export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SupabaseUser = {
  email?: string | null;
};

type ActivateBody = {
  handle?: unknown;
  displayName?: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function getUserFromBearer(req: Request): Promise<SupabaseUser | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !apikey) return null;

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const user = (await res.json().catch(() => null)) as SupabaseUser | null;
  return user;
}

function normalizeHandle(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32);
}

function normalizeDisplayName(raw: unknown, fallback: string): string {
  const name = String(raw ?? "").trim();
  return name.length ? name : fallback;
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    const email = user?.email ? String(user.email).trim().toLowerCase() : null;
    if (!email) return jsonError("unauthenticated", 401);

    const body = (await req.json().catch(() => ({}))) as ActivateBody;

    const handle = normalizeHandle(body.handle);
    if (!handle) return jsonError("Handle required", 400);

    const displayName = normalizeDisplayName(body.displayName, handle);

    const existingHandle = await prisma.creatorProfile.findFirst({ where: { handle } });
    if (existingHandle && existingHandle.email !== email) {
      return jsonError("Handle already taken", 409);
    }

    const profile = await prisma.creatorProfile.upsert({
      where: { email },
      update: { handle, displayName, status: "ACTIVE" },
      create: { email, handle, displayName, status: "ACTIVE" },
    });

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e: unknown) {
    console.error("[api/creator/activate] error", e);
    return NextResponse.json(
      { error: errorMessage(e) || "Server error" },
      { status: 500 }
    );
  }
}

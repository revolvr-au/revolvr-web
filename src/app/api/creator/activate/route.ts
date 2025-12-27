import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";

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
  return res.json().catch(() => null);
}

function normalizeHandle(raw: unknown) {
  const h = String(raw ?? "").trim();
  // basic: lower, spaces -> dashes, remove weird chars
  return h
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32);
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    const email = user?.email ? String(user.email).trim().toLowerCase() : null;

    if (!email) return jsonError("unauthenticated", 401);

    const body = await req.json().catch(() => ({}));
    const handle = normalizeHandle(body.handle);
    const displayNameRaw = String(body.displayName ?? "").trim();
    const displayName = displayNameRaw || handle;

    if (!handle) return jsonError("Handle is required", 400);

    // Idempotent activation
    const profile = await prisma.creatorProfile.upsert({
      where: { email },
      update: {
        handle,
        displayName,
        status: "ACTIVE",
      },
      create: {
        email,
        handle,
        displayName,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e: any) {
    console.error("[api/creator/activate] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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
  if (!url || !apikey) return null;

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json().catch(() => null);
}

function normalizeHandle(raw: unknown) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32);
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    const email = user?.email?.toLowerCase();

    if (!email) return jsonError("unauthenticated", 401);

    const body = await req.json();
    const handle = normalizeHandle(body.handle);
    const displayName = String(body.displayName || handle).trim();

    if (!handle) return jsonError("Handle required");

    // Ensure handle is not owned by someone else
    const existingHandle = await prisma.creatorProfile.findFirst({
      where: { handle },
    });

    if (existingHandle && existingHandle.email !== email) {
      return jsonError("Handle already taken", 409);
    }

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

    return NextResponse.json({ ok: true, profile });
  } catch (e: any) {
    console.error("[creator/activate]", e);
    return NextResponse.json(
      { error: e.code || e.message || "Server error" },
      { status: 500 }
    );
  }
}

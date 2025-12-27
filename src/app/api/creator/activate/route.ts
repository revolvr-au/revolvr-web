import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getUserEmailFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !apikey) throw new Error("Supabase env missing");

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const user = await res.json();
  return user?.email?.toLowerCase() ?? null;
}

export async function POST(req: Request) {
  try {
    const email = await getUserEmailFromBearer(req);
    if (!email) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const body = await req.json();
    const handle = String(body.handle || "").trim();
    const displayName = String(body.displayName || "").trim();

    if (!handle) {
      return NextResponse.json({ error: "handle_required" }, { status: 400 });
    }

    // 🔒 Single source of truth
    const creator = await prisma.creatorProfile.upsert({
      where: { email },
      update: {
        handle,
        displayName: displayName || handle,
        status: "ACTIVE",
      },
      create: {
        email,
        handle,
        displayName: displayName || handle,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ ok: true, creator }, { status: 200 });
  } catch (err) {
    console.error("[creator/activate]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

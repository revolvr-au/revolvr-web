import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeHandle(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_\.]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 24);
}

async function getUserEmailFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!apikey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const user = await res.json().catch(() => null);
  const email = user?.email ? String(user.email).trim().toLowerCase() : null;
  return email;
}

export async function POST(req: Request) {
  try {
    const email = await getUserEmailFromBearer(req);

    if (!email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));

    const handle = normalizeHandle(String(body.handle ?? ""));
    const displayName = String(body.displayName ?? "").trim();

    if (!handle || handle.length < 3) {
      return NextResponse.json(
        { error: "Handle must be at least 3 characters." },
        { status: 400 }
      );
    }

    const profile = await prisma.creatorProfile.upsert({
      where: { email },
      create: {
        email,
        handle,
        displayName: displayName || handle,
        status: "ACTIVE",
      },
      update: {
        handle,
        displayName: displayName || undefined,
        status: "ACTIVE",
      },
    });

    await prisma.creatorBalance.upsert({
      where: { creatorEmail: email },
      create: { creatorEmail: email, totalEarnedCents: 0, availableCents: 0 },
      update: {},
    });

    return NextResponse.json(
      {
        ok: true,
        creator: {
          isActive: profile.status === "ACTIVE",
          handle: profile.handle ?? null,
        },
        profile,
      },
      { status: 200 }
    );
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg.toLowerCase().includes("unique") && msg.toLowerCase().includes("handle")) {
      return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
    }
    console.error("[api/creator/activate] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


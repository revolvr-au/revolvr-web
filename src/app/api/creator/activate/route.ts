import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";

function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

function normalizeHandle(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_\.]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 24);
}

export async function POST(req: Request) {
  try {
    const supabase = supabaseServer();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const email = user.email.trim().toLowerCase();
    const body = await req.json().catch(() => ({} as any));

    const rawHandle = String(body.handle ?? "");
    const displayName = String(body.displayName ?? "").trim();

    const handle = normalizeHandle(rawHandle);

    if (!handle || handle.length < 3) {
      return NextResponse.json({ error: "Handle must be at least 3 characters." }, { status: 400 });
    }

    // Upsert profile by email (because your current schema is email-centric)
    // If your Prisma schema also has a unique userId, switch to that ASAP.
    const profile = await prisma.creatorProfile.upsert({
      where: { email },
      create: {
        email,
        handle,
        displayName: displayName || handle,
        isActive: true,
        stripeOnboardingComplete: false,
      },
      update: {
        handle,
        displayName: displayName || undefined,
        isActive: true,
      },
    });

    // Ensure balance exists (optional, but avoids null assumptions elsewhere)
    await prisma.creatorBalance.upsert({
      where: { creatorEmail: email },
      create: { creatorEmail: email, totalEarnedCents: 0, availableCents: 0 },
      update: {},
    });

    return NextResponse.json(
      {
        ok: true,
        creator: {
          isActive: Boolean(profile.isActive),
          handle: profile.handle ?? null,
          stripeOnboardingComplete: Boolean(profile.stripeOnboardingComplete),
        },
        profile,
      },
      { status: 200 }
    );
  } catch (e: any) {
    // Handle unique constraint collisions on handle
    const msg = String(e?.message ?? "");
    if (msg.toLowerCase().includes("unique") && msg.toLowerCase().includes("handle")) {
      return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
    }

    console.error("[api/creator/activate] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

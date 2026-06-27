import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/dm";

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { handle, displayName, avatarUrl, bio } = body as {
    handle?: string;
    displayName?: string;
    avatarUrl?: string | null;
    bio?: string;
  };

  if (!displayName?.trim()) {
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }

  // Normalize ourselves so the row we write is keyed identically to the row the
  // minor-block safety read looks up (isUserMinor -> normalizeEmail in src/lib/dm.ts).
  // Don't rely on Supabase lowercasing the email for us — if write-key and read-key
  // diverge, the isMinor guard silently misses.
  const email = normalizeEmail(user.email);
  const now = new Date();
  const bioTrimmed = bio?.trim() ?? null;
  const handleTrimmed = handle?.trim().toLowerCase() || null;

  try {
    // Always upsert profiles
    await prisma.profiles.upsert({
      where: { email },
      create: {
        email,
        display_name: displayName.trim(),
        avatar_url: avatarUrl ?? null,
        bio: bioTrimmed,
        created_at: now,
        updated_at: now,
      },
      update: {
        display_name: displayName.trim(),
        avatar_url: avatarUrl ?? null,
        bio: bioTrimmed,
        updated_at: now,
      },
    });

    // Always upsert CreatorProfile — create if doesn't exist
    await prisma.creatorProfile.upsert({
      where: { email },
      create: {
        email,
        displayName: displayName.trim(),
        handle: handleTrimmed,
        avatarUrl: avatarUrl ?? null,
        bio: bioTrimmed,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        displayName: displayName.trim(),
        handle: handleTrimmed,
        avatarUrl: avatarUrl ?? null,
        bio: bioTrimmed,
        updatedAt: now,
      },
    });

  } catch (e) {
    console.error("profile setup failed:", e);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
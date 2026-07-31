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
  const { handle, displayName, avatarUrl, avatarLiveUrl, bio } = body as {
    handle?: string;
    displayName?: string;
    avatarUrl?: string | null;
    avatarLiveUrl?: string | null;
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
    // Pre-flight the handle before ANY write. CreatorProfile.handle is @unique, so a
    // handle owned by another account would otherwise blow up the SECOND upsert below,
    // after profiles has already been written. Same shape as /api/creator/activate.
    // A null handle (/me saving with the field cleared) skips the check — nullable
    // unique columns allow many nulls.
    if (handleTrimmed) {
      const owner = await prisma.creatorProfile.findFirst({
        where: { handle: handleTrimmed },
        select: { email: true },
      });
      if (owner && owner.email !== email) {
        return NextResponse.json({ error: "Handle already taken." }, { status: 409 });
      }
    }

    // Always upsert profiles
    await prisma.profiles.upsert({
      where: { email },
      create: {
        email,
        display_name: displayName.trim(),
        avatar_url: avatarUrl ?? null,
        avatar_live_url: avatarLiveUrl ?? null,
        bio: bioTrimmed,
        created_at: now,
        updated_at: now,
      },
      update: {
        display_name: displayName.trim(),
        avatar_url: avatarUrl ?? null,
        // Conditional: /me's profile save calls this route WITHOUT avatarLiveUrl
        // after avatar/process already wrote it directly. An unconditional `?? null`
        // here would wipe it on every save.
        ...(avatarLiveUrl != null ? { avatar_live_url: avatarLiveUrl } : {}),
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
        avatarLiveUrl: avatarLiveUrl ?? null,
        bio: bioTrimmed,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        displayName: displayName.trim(),
        handle: handleTrimmed,
        avatarUrl: avatarUrl ?? null,
        ...(avatarLiveUrl != null ? { avatarLiveUrl } : {}),
        bio: bioTrimmed,
        updatedAt: now,
      },
    });

  } catch (e) {
    // Backstop for the race the pre-flight above can't close: a concurrent claim
    // between the read and the write surfaces as a unique-constraint violation on
    // CreatorProfile.handle. Report it as the same 409, not a generic 500 — handle is
    // a required field on /onboard, so the user needs to know to pick another one.
    // meta.target is a column-name array on some Prisma/driver combinations and the
    // constraint name ("CreatorProfile_handle_key") on others; stringify and match so
    // either shape is caught, and so an unrelated unique violation still falls to 500.
    const err = e as { code?: string; meta?: { target?: unknown } };
    if (
      err?.code === "P2002" &&
      JSON.stringify(err.meta?.target ?? "").includes("handle")
    ) {
      return NextResponse.json({ error: "Handle already taken." }, { status: 409 });
    }
    console.error("profile setup failed:", e);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
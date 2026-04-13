import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";

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
  const { handle, displayName, avatarUrl } = body as {
    handle?: string;
    displayName?: string;
    avatarUrl?: string | null;
  };

  if (!displayName?.trim()) {
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }

  const email = user.email;
  const now = new Date();

  try {
    await prisma.profiles.upsert({
      where: { email },
      create: {
        email,
        display_name: displayName.trim(),
        avatar_url: avatarUrl ?? null,
        created_at: now,
        updated_at: now,
      },
      update: {
        display_name: displayName.trim(),
        avatar_url: avatarUrl ?? null,
        updated_at: now,
      },
    });
  } catch (e) {
    console.error("profiles upsert failed:", e);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }

  const existing = await prisma.creatorProfile.findUnique({ where: { email } });
  if (existing) {
    await prisma.creatorProfile.update({
      where: { email },
      data: {
        handle: handle?.trim() || existing.handle,
        displayName: displayName.trim(),
        avatarUrl: avatarUrl ?? existing.avatarUrl,
        updatedAt: now,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

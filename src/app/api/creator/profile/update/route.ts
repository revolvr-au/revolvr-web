import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

async function updateProfileWithBestEffort(email: string, input: {
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  bio: string | null;
}) {
  // Base fields that (should) exist
  const base: any = {
    displayName: input.displayName,
    handle: input.handle,
    bio: input.bio,
  };

  // Attempt 1: snake_case avatar_url
  try {
    const data1: any = { ...base, avatar_url: input.avatarUrl };
    return await prisma.creatorProfile.update({
      where: { email },
      data: data1,
    });
  } catch (e: unknown) {
    const m = errMsg(e);
    // If avatar_url isn't a valid field, retry with camelCase.
    if (!m.includes("Unknown argument `avatar_url`")) throw e;
  }

  // Attempt 2: camelCase avatarUrl
  const data2: any = { ...base, avatarUrl: input.avatarUrl };
  return await prisma.creatorProfile.update({
    where: { email },
    data: data2,
  });
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user?.email) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const email = data.user.email.toLowerCase();

    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim() : "";
    const handle = typeof body.handle === "string" ? body.handle.trim() : "";
    const avatarUrl =
      typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";

    const existing = await prisma.creatorProfile.findUnique({ where: { email } });
    if (!existing) {
      return NextResponse.json(
        { error: "Creator profile not found. Complete creator onboarding first." },
        { status: 400 },
      );
    }

    await updateProfileWithBestEffort(email, {
      displayName: displayName || null,
      handle: handle || null,
      avatarUrl: avatarUrl || null,
      bio: bio || null,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: errMsg(e) || "Server error" },
      { status: 500 },
    );
  }
}

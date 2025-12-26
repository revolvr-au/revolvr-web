import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function normalizeHandle(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_.]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 24);
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
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

    const { data, error } = await supabase.auth.getUser();
    const user = data?.user;

    if (error || !user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const email = user.email.trim().toLowerCase();
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
      { ok: true, creator: { isActive: true, handle: profile.handle } },
      { status: 200 }
    );
  } catch (e) {
    console.error("[api/creator/activate] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

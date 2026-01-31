import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // Verify token + extract email
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user?.email) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const email = data.user.email.toLowerCase().trim();

    const body = await req.json().catch(() => ({}));

    const displayName = String(body?.displayName ?? "").trim();
    const handle = String(body?.handle ?? "").trim();
    const avatarUrl = String(body?.avatarUrl ?? "").trim();
    const bio = String(body?.bio ?? "").trim();

    // Optional: normalize handle (recommended)
    const normalizedHandle = handle ? handle.toLowerCase() : null;

    // Update the REAL table: public.creator_profiles
    await prisma.creatorProfile.update({
  where: { email },
  data: {
    displayName: displayName || undefined,
    handle: normalizedHandle,
    avatarUrl: avatarUrl || null,
    bio: bio || null,
  },
});


    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

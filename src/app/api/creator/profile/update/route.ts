import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

// NOTE: route is at src/app/api/creator/profile/update/route.ts
// generated client is at src/generated/prisma
import { Prisma } from "../../../../../generated/prisma";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

function pickExistingField(
  existing: Set<string>,
  candidates: string[],
): string | null {
  for (const c of candidates) if (existing.has(c)) return c;
  return null;
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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

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

    // Authoritative set of scalar fields on CreatorProfile (from generated Prisma client)
    const scalarFields = new Set<string>(
      Object.keys(Prisma.CreatorProfileScalarFieldEnum),
    );

    const updateData: any = {};
    const applied: string[] = [];

    // display name candidates
    {
      const f = pickExistingField(scalarFields, ["displayName", "display_name"]);
      if (f) {
        updateData[f] = displayName || null;
        applied.push(f);
      }
    }

    // handle candidates (likely just "handle")
    {
      const f = pickExistingField(scalarFields, ["handle"]);
      if (f) {
        updateData[f] = handle || null;
        applied.push(f);
      }
    }

    // avatar candidates (try common patterns)
    {
      const f = pickExistingField(scalarFields, [
        "avatarUrl",
        "avatar_url",
        "avatar",
        "profileImageUrl",
        "profile_image_url",
        "imageUrl",
        "image_url",
      ]);
      if (f) {
        updateData[f] = avatarUrl || null;
        applied.push(f);
      }
    }

    // bio candidates (try common patterns)
    {
      const f = pickExistingField(scalarFields, [
        "bio",
        "bioText",
        "bio_text",
        "about",
        "aboutMe",
        "about_me",
        "description",
      ]);
      if (f) {
        updateData[f] = bio || null;
        applied.push(f);
      }
    }

    // If nothing matched schema, do not try to update (avoid no-op confusion)
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No updatable fields matched CreatorProfile schema. Check prisma/schema.prisma model CreatorProfile.",
          availableFields: Array.from(scalarFields).sort(),
        },
        { status: 400 },
      );
    }

    await prisma.creatorProfile.update({
  where: { email },
  data: {
    displayName: displayName || null,
    handle: handle || null,
    avatar_url: avatarUrl || null,
    bio: bio || null,
  },
});


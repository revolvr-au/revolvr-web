import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { normalizeEmail } from "@/lib/dm";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { avatarUrl } = await req.json();
    if (!avatarUrl) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // Auth-derived identity — the email is taken from the caller's session, never the
    // request body, so a caller can only ever modify their own avatar (closes the IDOR
    // where any email could be passed to the service-role client).
    const rawEmail = await getAuthedEmailOrNull();
    if (!rawEmail) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // DB where-key only — normalized to match the row profile/setup writes and the
    // minor-block reads (isUserMinor). The storage filename below intentionally stays
    // on the raw email; the no-match-throw on profiles.update is left as a follow-up.
    const dbEmail = normalizeEmail(rawEmail);

    // Call fal-ai/bria-rmbg via HF router
   const hfRes = await fetch("https://fal.run/fal-ai/birefnet", {
  method: "POST",
  headers: {
    Authorization: `Key ${process.env.FAL_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    image_url: avatarUrl,
    model: "General Use (Light)",
    operating_on_foreground: false,
  }),
});

if (!hfRes.ok) {
  const err = await hfRes.text();
  throw new Error(`Fal API error: ${err}`);
}

const json = await hfRes.json();
const imageUrl = json?.image?.url;
if (!imageUrl) throw new Error(`No image returned: ${JSON.stringify(json)}`);

const pngRes = await fetch(imageUrl);
const pngBuffer = Buffer.from(await pngRes.arrayBuffer());

    // Upload to avatars-live bucket
    const filename = `${rawEmail.replace(/[^a-z0-9]/gi, "-")}-${Date.now()}.png`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("avatars-live")
      .upload(filename, pngBuffer, { contentType: "image/png", upsert: true });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars-live")
      .getPublicUrl(filename);

    // Update both tables
    await Promise.all([
      prisma.profiles.update({
        where: { email: dbEmail },
        data: { avatar_live_url: publicUrl },
      }),
      prisma.creatorProfile.findUnique({ where: { email: dbEmail }, select: { id: true } }).then((c) => {
        if (c) return prisma.creatorProfile.update({
          where: { email: dbEmail },
          data: { avatarLiveUrl: publicUrl },
        });
      }),
    ]);

    return NextResponse.json({ ok: true, avatarLiveUrl: publicUrl });

  } catch (e: any) {
    console.error("[avatar/process]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
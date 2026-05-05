import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { avatarUrl, email } = await req.json();
    if (!avatarUrl || !email) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // Fetch the image
    const imgRes = await fetch(avatarUrl);
    const imgBuffer = await imgRes.arrayBuffer();

    // Call HF Inference API — free, no package needed
    const hfRes = await fetch(
  "https://router.huggingface.co/hf-inference/models/briaai/RMBG-1.4",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      "Content-Type": "application/octet-stream",
    },
    body: imgBuffer,
  }
);

    if (!hfRes.ok) {
      const err = await hfRes.text();
      throw new Error(`HF API error: ${err}`);
    }

    const pngBuffer = Buffer.from(await hfRes.arrayBuffer());

    const filename = `${email.replace(/[^a-z0-9]/gi, "-")}-${Date.now()}.png`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("avatars-live")
      .upload(filename, pngBuffer, { contentType: "image/png", upsert: true });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars-live")
      .getPublicUrl(filename);

    await Promise.all([
      prisma.profiles.update({
        where: { email },
        data: { avatar_live_url: publicUrl },
      }),
      prisma.creatorProfile.findUnique({ where: { email }, select: { id: true } }).then((c) => {
        if (c) return prisma.creatorProfile.update({
          where: { email },
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
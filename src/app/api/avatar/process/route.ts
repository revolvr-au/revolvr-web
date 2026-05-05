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

// Module-level cache — stays warm between invocations on same container
let segmenter: any = null;

export async function POST(req: Request) {
  try {
    const { avatarUrl, email } = await req.json();
    if (!avatarUrl || !email) {
      return NextResponse.json({ error: "Missing avatarUrl or email" }, { status: 400 });
    }

    // 1. Load model once, cache it
    if (!segmenter) {
      const { pipeline } = await import("@xenova/transformers");
      segmenter = await pipeline("image-segmentation", "Xenova/modnet");
    }

    // 2. Run background removal
    const result = await segmenter(avatarUrl);
    const mask = result?.[0]?.mask;
    if (!mask) throw new Error("Model returned no mask");

    // 3. Fetch original + apply mask using sharp (available on Vercel nodejs runtime)
    const sharp = (await import("sharp")).default;
    const imgRes = await fetch(avatarUrl);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const { data: rawPixels, info } = await sharp(imgBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Apply mask to alpha channel
    const maskData = mask.data as Uint8Array;
    for (let i = 0; i < info.width * info.height; i++) {
      rawPixels[i * 4 + 3] = maskData[i];
    }

    const pngBuffer = await sharp(rawPixels, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();

    // 4. Upload transparent PNG to avatars-live bucket
    const filename = `${email.replace(/[^a-z0-9]/gi, "-")}-${Date.now()}.png`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("avatars-live")
      .upload(filename, pngBuffer, { contentType: "image/png", upsert: true });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars-live")
      .getPublicUrl(filename);

    // 5. Update both tables
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

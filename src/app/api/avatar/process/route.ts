import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { env } from "@huggingface/transformers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

env.cacheDir = "/tmp/transformers-cache";
env.authToken = process.env.HF_TOKEN ?? "";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let segmenter: any = null;

export async function POST(req: Request) {
  try {
    const { avatarUrl, email } = await req.json();
    if (!avatarUrl || !email) {
      return NextResponse.json({ error: "Missing avatarUrl or email" }, { status: 400 });
    }

    if (!segmenter) {
      const { pipeline } = await import("@huggingface/transformers");
      segmenter = await pipeline("background-removal", "onnx-community/BEN2-ONNX");
    }

    const result = await segmenter(avatarUrl);
    const pngBuffer = Buffer.from(await result[0].arrayBuffer());

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
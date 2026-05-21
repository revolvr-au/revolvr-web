import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const BUCKET = "posts";

// POST /api/posts/[id]/media — attach a media file to an existing post.
// Accepts multipart/form-data with a `file` field. The file is uploaded to
// the Supabase `posts` bucket; a PostMedia row is created and the public
// URL is surfaced on the parent Post for feed compatibility.
export async function POST(req: Request, { params }: { params: any }) {
  try {
    const { id } = await Promise.resolve(params);
    const postId = String(id ?? "").trim();
    if (!postId) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "expected_multipart_form_data", got: contentType },
        { status: 415 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    const isVideo = mime.startsWith("video/");
    const isImage = mime.startsWith("image/");
    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: "unsupported_media_type", mime },
        { status: 415 }
      );
    }

    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
    const path = `posts/${postId}/${randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(bytes), { contentType: mime, upsert: false });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = data.publicUrl;

    const existingCount = await prisma.postMedia.count({ where: { postId } });

    const media = await prisma.postMedia.create({
      data: {
        postId,
        type: isVideo ? "VIDEO" : "IMAGE",
        url: publicUrl,
        order: existingCount,
      },
    });

    await prisma.post.update({
      where: { id: postId },
      data: {
        imageUrl: isImage ? publicUrl : "",
        muxPlaybackId: isVideo ? publicUrl : null,
      },
    });

    return NextResponse.json({ ok: true, media });
  } catch (err: any) {
    console.error("POST /api/posts/[id]/media error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to save media" },
      { status: 500 }
    );
  }
}

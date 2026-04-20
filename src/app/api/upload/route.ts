import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { randomUUID } from "crypto";

const BUCKET = "posts";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `uploads/${randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(bytes), {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ ok: true, url: data.publicUrl });
}

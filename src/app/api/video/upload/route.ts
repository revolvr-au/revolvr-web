import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_TOKEN;

  if (!accountId || !token) {
    return NextResponse.json({ error: "Cloudflare not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const cfFormData = new FormData();
  cfFormData.append("file", file);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: cfFormData,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[video/upload] Cloudflare error:", res.status, err);
    return NextResponse.json({ error: "Upload failed", detail: err }, { status: 500 });
  }

  const { result } = await res.json();
  return NextResponse.json({ videoId: result.uid });
}

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_TOKEN;

  if (!accountId || !token) {
    return NextResponse.json({ error: "Cloudflare not configured" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": req.headers.get("Upload-Length") ?? "0",
        "Upload-Metadata": `maxDurationSeconds ${btoa("3600")}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[video/upload] Cloudflare TUS error:", res.status, JSON.stringify(err));
    return NextResponse.json({ error: "Failed to create upload URL", detail: err }, { status: 500 });
  }

  const uploadURL = res.headers.get("Location");
  const videoId = res.headers.get("stream-media-id");

  if (!uploadURL || !videoId) {
    console.error("[video/upload] Missing Location or stream-media-id headers");
    return NextResponse.json({ error: "Cloudflare did not return upload URL" }, { status: 500 });
  }

  return NextResponse.json({ uploadURL, videoId });
}

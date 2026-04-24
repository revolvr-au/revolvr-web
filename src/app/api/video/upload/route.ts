import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_TOKEN;

  if (!accountId || !token) {
    return NextResponse.json({ error: "Cloudflare not configured" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: 3600,
        requireSignedURLs: false,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[video/upload] Cloudflare error:", res.status, JSON.stringify(err));
    return NextResponse.json({
      error: "Failed to create upload URL",
      status: res.status,
      detail: err,
    }, { status: 500 });
  }

  const { result } = await res.json();

  return NextResponse.json({
    uploadURL: result.uploadURL,
    videoId: result.uid,
  });
}

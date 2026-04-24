import Mux from "@mux/mux-node";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const { uploadId } = await params;
  const mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID!,
    tokenSecret: process.env.MUX_TOKEN_SECRET!,
  });

  const upload = await mux.video.uploads.retrieve(uploadId);

  if (upload.asset_id) {
    const asset = await mux.video.assets.retrieve(upload.asset_id);
    const playbackId = asset.playback_ids?.[0]?.id;
    const ready = asset.status === "ready";
    return NextResponse.json({ ready, playbackId: playbackId ?? null });
  }

  return NextResponse.json({ ready: false, playbackId: null });
}

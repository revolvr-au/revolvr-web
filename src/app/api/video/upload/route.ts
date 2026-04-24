import Mux from "@mux/mux-node";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID!,
    tokenSecret: process.env.MUX_TOKEN_SECRET!,
  });

  const upload = await mux.video.uploads.create({
    cors_origin: "https://www.revolvr.net",
    new_asset_settings: {
      playback_policy: ["public"],
    },
  });

  return NextResponse.json({
    uploadURL: upload.url,
    uploadId: upload.id,
  });
}

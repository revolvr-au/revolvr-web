import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

async function generateToken() {
  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

  if (!apiKey || !apiSecret || !url) {
    return NextResponse.json(
      { error: "Missing LiveKit environment variables" },
      { status: 500 }
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: "viewer-" + crypto.randomUUID(),
  });

  at.addGrant({
    room: "revolvr-live",
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({ token, url });
}

export async function GET() {
  return generateToken();
}

export async function POST() {
  return generateToken();
}
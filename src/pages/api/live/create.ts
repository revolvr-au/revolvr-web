// src/app/api/live/create/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AccessToken } from "livekit-server-sdk";

const livekitUrl = process.env.LIVEKIT_URL;
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
  throw new Error(
    "Missing LiveKit env vars (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)"
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const title = body?.title ?? null;

    const dummyUserId = "user-123"; // until we hook real auth
    const roomName = `revolvr-${randomUUID()}`;
    const hostIdentity = `host-${dummyUserId}-${roomName}`;

    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: hostIdentity,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const hostToken = at.toJwt();

    return NextResponse.json(
      {
        sessionId: roomName,
        roomName,
        hostIdentity,
        hostToken,
        livekitUrl,
        title,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("LIVEKIT create error", err);
    return NextResponse.json(
      { error: "Failed to create live session" },
      { status: 500 }
    );
  }
}

// For anything other than POST, 405
export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

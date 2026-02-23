import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs"; // IMPORTANT: server-sdk requires node

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const room = String(body?.room ?? "").trim();
    const identity = String(body?.identity ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const role = (body?.role === "host" ? "host" : "viewer") as "host" | "viewer";

    if (!room || !identity) {
      return NextResponse.json({ error: "Missing room or identity" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "LiveKit env not set" }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: name || identity,
    });

    // Permissions
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: role === "host",
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (e) {
    console.error("[api/live/token] error", e);
    return NextResponse.json({ error: "Token error" }, { status: 500 });
  }
}
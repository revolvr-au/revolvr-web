import type { NextApiRequest, NextApiResponse } from "next";
import { AccessToken } from "livekit-server-sdk";

const livekitUrl = process.env.LIVEKIT_URL!;
const livekitApiKey = process.env.LIVEKIT_API_KEY!;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET!;

if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
  throw new Error(
    "Missing LiveKit env vars (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)"
  );
}

type Data =
  | {
      roomName: string;
      viewerIdentity: string;
      viewerToken: string;
      livekitUrl: string;
    }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // folder is [sessionsid], so the query key is "sessionsid"
  const { sessionsid } = req.query;

  const sessionId =
    typeof sessionsid === "string" ? sessionsid : sessionsid?.[0];

  if (!sessionId) {
    return res.status(400).json({ error: "Missing or invalid sessionId" });
  }

  const roomName = sessionId;
  const viewerIdentity = `viewer-${Math.random().toString(36).slice(2, 10)}`;

  const at = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity: viewerIdentity,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: false,
    canSubscribe: true,
  });

  const jwt = await at.toJwt();

  return res.status(200).json({
    roomName,
    viewerIdentity,
    viewerToken: jwt,
    livekitUrl,
  });
}

// src/pages/api/live/[sessionId]/viewer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { AccessToken } from "livekit-server-sdk";

const livekitUrl = process.env.LIVEKIT_URL;
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
  throw new Error(
    "Missing LiveKit env vars (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)"
  );
}

function createViewerToken(roomName: string, identity: string) {
  const at = new AccessToken(livekitApiKey, livekitApiSecret, { identity });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: false,
    canSubscribe: true,
  });

  return {
    token: at.toJwt(),
    url: livekitUrl,
  };
}

type Data =
  | {
      sessionId: string;
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

  const { sessionId } = req.query;
  const id = String(sessionId);

  const roomName = id;
  const viewerIdentity = `viewer-${Math.random().toString(36).slice(2)}`;

  const { token: viewerToken, url: lkUrl } = createViewerToken(
    roomName,
    viewerIdentity
  );

  return res.status(200).json({
    sessionId: id,
    roomName,
    viewerIdentity,
    viewerToken: lkUrl ? viewerToken : "",
    livekitUrl: lkUrl,
  });
}

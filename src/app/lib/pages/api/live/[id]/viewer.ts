// pages/api/live/[id]/viewer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createViewerToken } from "@/lib/livekit"; // or "../../../../lib/livekit"

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

  const { id } = req.query;
  const sessionId = String(id);

  // TODO: lookup in DB; for now, assume roomName = sessionId
  const roomName = sessionId;
  const viewerIdentity = `viewer-${Math.random().toString(36).slice(2)}`;

  const { token: viewerToken, url: livekitUrl } = createViewerToken(
    roomName,
    viewerIdentity
  );

  return res.status(200).json({
    sessionId,
    roomName,
    viewerIdentity,
    viewerToken,
    livekitUrl,
  });
}

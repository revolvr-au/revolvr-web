// pages/api/live/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { createHostToken } from "@/lib/livekit"; // if @ alias doesn't work, change to "../../../lib/livekit"

type Data =
  | {
      sessionId: string;
      roomName: string;
      hostIdentity: string;
      hostToken: string;
      livekitUrl: string;
      title?: string | null;
    }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title } = req.body ?? {};

  // TODO: replace with your real auth lookup
  const dummyUserId = "user-123";

  const roomName = `revolvr-${randomUUID()}`;
  const hostIdentity = `host-${dummyUserId}-${roomName}`;

  const { token: hostToken, url: livekitUrl } = createHostToken(
    roomName,
    hostIdentity
  );

  // TODO: store in DB later (roomName, hostIdentity, title, userId, status='scheduled')

  return res.status(200).json({
    sessionId: roomName,
    roomName,
    hostIdentity,
    hostToken,
    livekitUrl,
    title: title ?? null,
  });
}

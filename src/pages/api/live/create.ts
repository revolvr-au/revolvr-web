// src/pages/api/live/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { AccessToken } from "livekit-server-sdk";

const livekitUrl = process.env.LIVEKIT_URL;
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

console.log("------ LIVEKIT ENV DEBUG ------");
console.log("LIVEKIT_URL =", livekitUrl);
console.log("LIVEKIT_API_KEY =", livekitApiKey?.slice(0, 8));
console.log(
  "LIVEKIT_API_SECRET =",
  livekitApiSecret?.slice(0, 6),
  "...",
  livekitApiSecret?.slice(-6)
);
console.log("--------------------------------");
console.log("LIVEKIT_API_SECRET RAW =", JSON.stringify(livekitApiSecret));

if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
  throw new Error(
    "Missing LiveKit env vars (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)"
  );
}

// 🔑 Generate a plain JWT string (async!)
async function createHostToken(
  roomName: string,
  identity: string
): Promise<string> {
  const at = new AccessToken(livekitApiKey, livekitApiSecret, { identity });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  // toJwt is async in newer SDK versions
  const jwt = await at.toJwt();

  console.log(
    "LIVEKIT host token length:",
    jwt?.length,
    "room:",
    roomName,
    "identity:",
    identity
  );

  return jwt; // <- plain JWT string
}

type Data =
  | {
      sessionId: string;
      roomName: string;
      hostIdentity: string;
      hostToken: string; // plain JWT
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

  const dummyUserId = "user-123";
  const roomName = `revolvr-${randomUUID()}`;
  const hostIdentity = `host-${dummyUserId}-${roomName}`;

  // ✅ get the JWT string
  const hostToken = await createHostToken(roomName, hostIdentity);

  return res.status(200).json({
    sessionId: roomName,
    roomName,
    hostIdentity,
    hostToken,          // ✅ plain string
    livekitUrl: livekitUrl!,
    title: title ?? null,
  });
}

// src/pages/api/live/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { AccessToken } from "livekit-server-sdk";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

const livekitUrl = process.env.LIVEKIT_URL!;
const livekitApiKey = process.env.LIVEKIT_API_KEY!;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET!;

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

if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
  throw new Error(
    "Missing LiveKit env vars (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)"
  );
}

// 🔹 async because toJwt() returns a Promise<string>
async function createHostToken(
  roomName: string,
  identity: string
): Promise<{ token: string; url: string }> {
  const at = new AccessToken(livekitApiKey, livekitApiSecret, { identity });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const jwt = await at.toJwt();

  console.log(
    "LIVEKIT host token length:",
    jwt.length,
    "room:",
    roomName,
    "identity:",
    identity
  );

  return {
    token: jwt,
    url: livekitUrl,
  };
}

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

  // 🔐 Get the real Supabase user from cookies
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[live/create] supabase.auth.getUser error", userError);
  }

  if (!user) {
    console.warn("[live/create] No authenticated user");
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { title } = req.body ?? {};

  const hostId = user.id; // ✅ REAL Supabase user id
  const roomName = `revolvr-${randomUUID()}`;
  const hostIdentity = `host-${hostId}-${roomName}`;

  // 📝 Record the live session in Supabase
  const { error: insertError } = await supabase.from("live_sessions").insert({
    room_name: roomName,
    host_id: hostId,
    title: title ?? null,
    status: "live",
  });

  if (insertError) {
    console.error("[live/create] failed to insert live_session", insertError);
    return res.status(500).json({ error: "Could not create live session" });
  }

  const { token: hostToken, url: lkUrl } = await createHostToken(
    roomName,
    hostIdentity
  );

  return res.status(200).json({
    sessionId: roomName,
    roomName,
    hostIdentity,
    hostToken,
    livekitUrl: lkUrl,
    title: title ?? null,
  });
}

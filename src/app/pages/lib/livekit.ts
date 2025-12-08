// lib/livekit.ts
import { AccessToken } from "livekit-server-sdk";

const livekitUrl = process.env.LIVEKIT_URL;
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
  throw new Error(
    "Missing LiveKit env vars (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)"
  );
}

/** HOST token – creator can publish + subscribe */
export function createHostToken(roomName: string, identity: string) {
  const at = new AccessToken(livekitApiKey, livekitApiSecret, { identity });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return {
    token: at.toJwt(),
    url: livekitUrl,
  };
}

/** VIEWER token – viewer can only subscribe */
export function createViewerToken(roomName: string, identity: string) {
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

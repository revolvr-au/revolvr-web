"use client";

import { LiveKitRoom } from "@livekit/components-react";
import LiveRoom from "./LiveRoom";

export default function LiveClient() {
  const token = process.env.NEXT_PUBLIC_LIVEKIT_TOKEN; // temporary

  if (!token) {
    return <div className="text-white p-4">Missing LiveKit token</div>;
  }

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect={true}
      audio={true}
      video={true}
    >
      <LiveRoom />
    </LiveKitRoom>
  );
}
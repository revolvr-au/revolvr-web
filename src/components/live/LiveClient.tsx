"use client";

import { LiveKitRoom } from "@livekit/components-react";
import LiveRoom from "./LiveRoom";

export default function LiveClient() {
  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={/* your token fetch logic here */}
      connect={true}
      audio={true}
      video={true}
    >
      <LiveRoom />
    </LiveKitRoom>
  );
}
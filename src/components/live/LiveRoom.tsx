"use client";

import TopBar from "@/components/live/TopBar";
import VideoCanvas from "@/components/live/VideoCanvas";
import LiveChatOverlay from "@/components/live/LiveChatOverlay";
import RevolvrComposer from "@/components/live/RevolvrComposer";

export default function LiveRoomPage() {
  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden text-white">
      
      {/* Video */}
      <VideoCanvas />

      {/* Top */}
      <TopBar />

      {/* Chat Overlay */}
      <LiveChatOverlay />

      {/* Bottom Composer */}
      <div className="absolute bottom-0 inset-x-0 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <RevolvrComposer />
      </div>
    </div>
  );
}
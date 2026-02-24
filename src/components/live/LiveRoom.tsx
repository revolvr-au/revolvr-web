"use client";

import VideoCanvas from "./VideoCanvas";
import TopBar from "./TopBar";
import CommentRail from "./CommentRail";
import HeartStream from "./HeartStream";
import BottomBar from "./BottomBar";

export default function LiveRoom() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <VideoCanvas />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 z-5" />
      <TopBar />
      <CommentRail />
      <HeartStream />
      <BottomBar />
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import RevolvrChatFeed from "@/components/live/RevolvrChatFeed";
import RevolvrComposer from "@/components/live/RevolvrComposer";

import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export default function LiveRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();

  const sessionId = decodeURIComponent(params?.sessionId ?? "");
  const role = searchParams?.get("role") || "";
  const isHost = role === "host";

  const [lkUrl, setLkUrl] = useState("");
  const [token, setToken] = useState("");
  const [joined, setJoined] = useState(!isHost);
  const [hearts, setHearts] = useState<{ id: string; x: number }[]>([]);

  const triggerHeart = () => {
    const id = crypto.randomUUID();
    const randomX = Math.floor(Math.random() * 120);

    setHearts((prev) => [...prev, { id, x: randomX }]);

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1400);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      triggerHeart();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function initLive() {
      try {
        const res = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: sessionId,
            identity:
              (isHost ? "host-" : "viewer-") + crypto.randomUUID(),
            role: isHost ? "host" : "viewer",
          }),
        });

        const data = await res.json();
        if (!res.ok || !data?.token) return;

        setLkUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL || "");
        setToken(data.token);
      } catch (err) {
        console.error("Live init error", err);
      }
    }

    if (sessionId) initLive();
  }, [sessionId, isHost]);

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      onDoubleClick={triggerHeart}
    >
      {/* Ambient Glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-10"
        animate={{ opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 6, repeat: Infinity }}
        style={{
          background:
            "radial-gradient(circle at 30% 60%, rgba(16,185,129,0.4), transparent 40%)",
          filter: "blur(120px)",
        }}
      />

      {/* Floating Hearts */}
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              y: -200,
              scale: [1, 1.3, 1],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="absolute bottom-28 text-pink-500 text-2xl pointer-events-none z-40"
            style={{ right: 40 + h.x }}
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Video Stage */}
      {token && lkUrl ? (
        <LiveKitRoom
          token={token}
          serverUrl={lkUrl}
          connect={isHost ? joined : true}
          video={isHost && joined}
          audio
          className="h-full w-full"
        >
          <RoomAudioRenderer />
          <StageVideo />
        </LiveKitRoom>
      ) : (
        <div className="h-full w-full grid place-items-center text-white/40 text-sm">
          Connecting…
        </div>
      )}

      {/* Header */}
      <div className="absolute top-[env(safe-area-inset-top)] pt-6 left-6 right-6 z-50 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
          <span className="text-white font-semibold tracking-widest text-sm">
            LIVE
          </span>
          <span className="text-white/60 text-sm ml-2">
            128 watching
          </span>
        </div>

        <button
          onClick={() => window.history.back()}
          className="pointer-events-auto px-4 py-2 rounded-full bg-white/10 backdrop-blur text-white text-sm hover:bg-white/20 transition"
        >
          Exit
        </button>
      </div>

      {/* Host Button */}
      {isHost && !joined && (
        <div className="absolute inset-x-0 bottom-12 px-6 z-50">
          <button
            onClick={() => setJoined(true)}
            className="w-full rounded-2xl bg-emerald-400 py-4 text-black font-semibold text-lg"
          >
            Go Live
          </button>
        </div>
      )}

      <RevolvrChatFeed />
      <RevolvrComposer />
    </div>
  );
}

function StageVideo() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true }
  );

  const hostTrack =
    tracks.find((t) =>
      (t.participant as any)?.identity?.toLowerCase().includes("host")
    ) || tracks[0];

  if (!hostTrack) return null;

  return (
    <ParticipantTile
      trackRef={hostTrack as any}
      className="h-full w-full object-cover"
    />
  );
}
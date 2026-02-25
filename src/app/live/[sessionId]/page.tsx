"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import LiveChatPanel from "@/components/live/LiveChatPanel";
import LiveSupportBar from "@/components/live/LiveSupportBar";
import LiveChatOverlay from "@/components/live/LiveChatOverlay";
import LiveReactionLayer from "@/components/live/LiveReactionLayer";

import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

import { supabase } from "@/lib/supabaseClients";

export default function LiveRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();

  const sessionId = decodeURIComponent(params?.sessionId ?? "");
  const creatorEmail = searchParams?.get("creator") ?? null;
  const role = searchParams?.get("role") || "";
  const isHost = role === "host";

  const [lkUrl, setLkUrl] = useState("");
  const [token, setToken] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Load logged-in user
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    };
    loadUser();
  }, []);

  // Fetch LiveKit token
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: sessionId,
            identity: isHost
              ? "host-" + crypto.randomUUID()
              : "viewer-" + crypto.randomUUID(),
            role: isHost ? "host" : "viewer",
          }),
        });

        const data = await res.json();
        if (!res.ok || !data?.token) {
          console.error("Token fetch failed", data);
          return;
        }

        setLkUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL || "");
        setToken(data.token);
      } catch (err) {
        console.error("Live init error", err);
      }
    }

    if (sessionId) init();
  }, [sessionId, isHost]);

  return (
    <div className="live-room bg-[#050814] text-white h-[100dvh] w-full overflow-hidden relative">
      {/* VIDEO */}
      <div className="absolute inset-0">
        <VideoStage
          token={token}
          serverUrl={lkUrl}
          isHost={isHost}
        />
        <LiveReactionLayer />
      </div>

      {/* CHAT FLOATING */}
      <LiveChatOverlay roomId={sessionId} />

      {/* SUPPORT + COMPOSER */}
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[90px]">
        <LiveSupportBar
          creatorEmail={creatorEmail}
          userEmail={userEmail}
          sessionId={sessionId}
          liveHrefForRedirect={`/live/${sessionId}`}
        />

        <LiveChatPanel
          roomId={sessionId}
          liveHrefForRedirect={`/live/${sessionId}`}
          userEmail={userEmail}
          variant="composer"
        />
      </div>
    </div>
  );
}

function VideoStage({
  token,
  serverUrl,
  isHost,
}: {
  token: string;
  serverUrl: string;
  isHost: boolean;
}) {
  const ready = Boolean(token && serverUrl);

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

  return (
    <section className="w-full h-full">
      <div className="relative w-full h-full overflow-hidden">
        {ready ? (
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            audio={true}
            video={isHost}
            className="h-full"
          >
            <RoomAudioRenderer />
            <StageVideo />
          </LiveKitRoom>
        ) : (
          <div className="h-full w-full grid place-items-center text-white/40 text-sm">
            Connecting…
          </div>
        )}
      </div>
    </section>
  );
}
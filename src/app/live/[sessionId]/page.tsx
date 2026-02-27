"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import LiveChatOverlay from "@/components/live/LiveChatOverlay";
import RevolvrComposer from "@/components/live/RevolvrComposer";

import {
  ControlBar,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export default function LiveRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();

  const safeSessionId = params?.sessionId ?? "";

  const sessionId = useMemo(() => {
    // Never allow a bad URI to crash navigation (mobile will "bounce back")
    try {
      return decodeURIComponent(safeSessionId);
    } catch {
      return safeSessionId;
    }
  }, [safeSessionId]);

  const role = searchParams?.get("role") || "";
  const isHost = role === "host";

  /* ================= TOKEN LOAD ================= */
  const [lkUrl, setLkUrl] = useState<string>("");
  const [activeToken, setActiveToken] = useState<string>("");

  useEffect(() => {
    if (!sessionId) return;

    const loadToken = async () => {
      try {
        const res = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            role: isHost ? "host" : "viewer",
          }),
        });

        if (!res.ok) {
          console.error("[live] failed to fetch token");
          return;
        }

        const data = await res.json();
        setLkUrl(data.url);
        setActiveToken(data.token);
      } catch (err) {
        console.error("[live] token error", err);
      }
    };

    loadToken();
  }, [sessionId, isHost]);

  /* ================= JOIN GATE ================= */
  const [joined, setJoined] = useState<boolean>(false);

  useEffect(() => {
    if (!isHost) {
      setJoined(true);
      return;
    }

    // Desktop auto-join; mobile requires user gesture (Go Live button)
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobileDevice) setJoined(true);
  }, [isHost]);

  /* ================= MOBILE DETECT ================= */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");

    const update = () => setIsMobile(Boolean(mq.matches));
    update();

    // iOS Safari compatibility: MediaQueryList may not support addEventListener/removeEventListener
    const hasAddEventListener = typeof (mq as any).addEventListener === "function";
    const hasAddListener = typeof (mq as any).addListener === "function";

    if (hasAddEventListener) {
      (mq as any).addEventListener("change", update);
      return () => (mq as any).removeEventListener("change", update);
    }

    if (hasAddListener) {
      (mq as any).addListener(update);
      return () => (mq as any).removeListener(update);
    }

    return;
  }, []);

  /* ================= MOBILE VIEW ================= */
  if (isMobile) {
    return (
      <div className="bg-[#050814] text-white h-[100dvh] w-full overflow-hidden relative">
        <div className="fixed top-2 left-2 z-[9999] rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
          LIVE_NEW_UI
        </div>

        <div className="absolute inset-0">
          <VideoStage token={activeToken} serverUrl={lkUrl} isMobile isHost={isHost} joined={joined} />
        </div>

        <LiveChatOverlay roomId={sessionId} />

        <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <RevolvrComposer roomId={sessionId} />
        </div>

        {isHost && !joined && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
          <div className="absolute inset-x-0 bottom-[86px] z-50 px-3">
            <button
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-black font-semibold"
              onClick={() => setJoined(true)}
            >
              Go Live
            </button>
            <p className="mt-2 text-xs text-white/60">Required on mobile to enable camera/microphone permissions.</p>
          </div>
        )}
      </div>
    );
  }

  /* ================= DESKTOP VIEW ================= */
  return (
    <div className="min-h-screen bg-[#050814] text-white relative">
      <div className="fixed top-2 left-2 z-[9999] rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
        LIVE_NEW_UI
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <VideoStage token={activeToken} serverUrl={lkUrl} isMobile={false} isHost={isHost} joined={joined} />
      </div>
    </div>
  );
}

/* ================= VIDEO STAGE ================= */
function VideoStage({
  token,
  serverUrl,
  isMobile,
  isHost,
  joined,
}: {
  token: string;
  serverUrl: string;
  isMobile: boolean;
  isHost: boolean;
  joined: boolean;
}) {
  const ready = Boolean(token && serverUrl);
  const shouldConnect = isHost ? joined : true;

  function StageConference() {
    const tracks = useTracks(
      [
        { source: Track.Source.ScreenShare, withPlaceholder: false },
        { source: Track.Source.Camera, withPlaceholder: true },
      ],
      { onlySubscribed: !isHost }
    );

    const active =
      tracks.find((t) => (t as any)?.source === Track.Source.ScreenShare) ||
      tracks.find((t) => (t as any)?.source === Track.Source.Camera) ||
      null;

    if (!active) {
      return (
        <div className="h-full w-full grid place-items-center text-white/50 text-sm">
          Waiting for video…
        </div>
      );
    }

    return <ParticipantTile trackRef={active as any} className="h-full w-full" />;
  }

  return (
    <section className={isMobile ? "w-full h-full" : "w-full max-w-xl"}>
      <div className="relative w-full h-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="relative w-full h-full">
          {ready ? (
            <LiveKitRoom token={token} serverUrl={serverUrl} connect={shouldConnect} audio video className="h-full">
              <RoomAudioRenderer />
              <StageConference />
              {!isMobile && <ControlBar />}
            </LiveKitRoom>
          ) : (
            <div className="h-full w-full grid place-items-center text-white/50 text-sm">
              Connecting…
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

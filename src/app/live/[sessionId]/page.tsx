// src/app/live/[sessionId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

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
import type { CheckoutMode } from "@/lib/purchase";
import {
  CreditBalances,
  loadCreditsForUser,
  spendOneCredit,
  PurchaseMode,
} from "@/lib/credits";

type PendingPurchase = { mode: PurchaseMode };
type LiveMode = PurchaseMode | "reaction" | "vote";
type CheckoutResponse = { url?: string; error?: string };

type RewardKind = "applause" | "fire" | "love" | "respect";

const LIVE_REWARDS: { id: RewardKind; label: string; icon: string }[] = [
  { id: "applause", label: "Applause", icon: "👏" },
  { id: "fire", label: "Fire", icon: "🔥" },
  { id: "love", label: "Love", icon: "❤️" },
  { id: "respect", label: "Respect", icon: "✅" },
];

export default function LiveRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = decodeURIComponent(params?.sessionId ?? "");
  const role = searchParams?.get("role") || "";
  const isHost = role === "host";

  const [lkUrl, setLkUrl] = useState("");
  const [hostToken, setHostToken] = useState("");
  const [viewerToken, setViewerToken] = useState("");
  const [joined, setJoined] = useState(!isHost);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setJoined(!isHost);
  }, [isHost]);

  useEffect(() => {
    try {
      setLkUrl(sessionStorage.getItem("lk_url") ?? "");
      setHostToken(sessionStorage.getItem("lk_host_token") ?? "");
      setViewerToken(sessionStorage.getItem("lk_viewer_token") ?? "");
    } catch {}
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    };
    loadUser();
  }, []);

  const activeToken = isHost ? hostToken : viewerToken;

  if (isMobile) {
    return (
      <div className="live-room bg-[#050814] text-white h-[100dvh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <VideoStage
            token={activeToken}
            serverUrl={lkUrl}
            isMobile={true}
            isHost={isHost}
            joined={joined}
          />
          <LiveReactionLayer />
        </div>

        <LiveChatOverlay roomId={sessionId} />

        <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[90px]">
          <LiveSupportBar
            creatorEmail={null}
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

        {isHost && !joined && (
          <div className="absolute inset-x-0 bottom-[86px] z-50 px-3">
            <button
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-black font-semibold"
              onClick={() => setJoined(true)}
            >
              Go Live
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="live-room min-h-screen bg-[#050814] text-white flex items-center justify-center px-4 py-6">
      <div className="relative w-full max-w-[480px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 bg-black/30">
      <button
  onClick={() => alert("Rewards triggered")}
  className="absolute top-4 right-4 z-50 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs"
>
  🎁 Reward
</button>
        <VideoStage
          token={activeToken}
          serverUrl={lkUrl}
          isMobile={false}
          isHost={isHost}
          joined={joined}
        />

        <LiveReactionLayer />

        <div className="absolute inset-0 pointer-events-none">
          <LiveChatOverlay roomId={sessionId} />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-50 px-3 pb-4">
          <LiveSupportBar
            creatorEmail={null}
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

        {isHost && !joined && (
          <div className="absolute inset-x-0 bottom-24 z-50 px-4">
            <button
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-black font-semibold"
              onClick={() => setJoined(true)}
            >
              Go Live
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoStage({
  token,
  serverUrl,
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

  function StageVideo() {
    const tracks = useTracks(
      [{ source: Track.Source.Camera, withPlaceholder: false }],
      { onlySubscribed: true }
    );

    const hostTrack =
      tracks.find((t) =>
        (t.participant as any)?.identity?.toLowerCase().includes("host")
      ) || tracks[0];

    if (!hostTrack) {
      return (
        <div className="h-full w-full grid place-items-center text-white/40 text-sm">
          Waiting for host…
        </div>
      );
    }

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
            connect={shouldConnect}
            audio={true}
            video={isHost && joined}
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
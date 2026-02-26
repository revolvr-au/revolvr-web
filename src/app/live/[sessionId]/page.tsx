"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import LiveChatPanel from "@/components/live/LiveChatPanel";
import LiveSupportBar from "@/components/live/LiveSupportBar";
import LiveChatOverlay from "@/components/live/LiveChatOverlay";

import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

import { supabase } from "@/lib/supabaseClients";
import {
  CreditBalances,
  loadCreditsForUser,
  spendOneCredit,
  PurchaseMode,
} from "@/lib/credits";

export default function LiveRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const safeSessionId = params?.sessionId ?? "";
  const sessionId = useMemo(
    () => decodeURIComponent(safeSessionId),
    [safeSessionId]
  );

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

  // Desktop auto-join
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(
    navigator.userAgent
  );

  if (!isMobileDevice) {
    setJoined(true);
  }
}, [isHost]);

  /* ================= AUTH ================= */

  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserEmail(user?.email ?? null);
      } catch {
        setUserEmail(null);
      }
    };
    loadUser();
  }, []);

  /* ================= CREATOR FIX ================= */

  const creatorEmail = useMemo(() => {
    const qs = searchParams?.get("creator")?.trim().toLowerCase() || "";
    return qs || null;
  }, [searchParams]);

  // AUTO-HEAL: if host and creator missing → inject it
  useEffect(() => {
    if (!isHost) return;
    if (!sessionId) return;
    if (!userEmail) return;
    if (creatorEmail) return;

    const qs = new URLSearchParams(searchParams?.toString());
    qs.set("creator", userEmail.toLowerCase());
    qs.set("role", "host");

    router.replace(`/live/${encodeURIComponent(sessionId)}?${qs.toString()}`);
  }, [isHost, sessionId, userEmail, creatorEmail, router, searchParams]);

  /* ================= CREDITS (NON BLOCKING) ================= */

  const [credits, setCredits] = useState<CreditBalances | null>(null);

  useEffect(() => {
    if (!userEmail) {
      setCredits(null);
      return;
    }

    const fetchCredits = async () => {
      try {
        const balances = await loadCreditsForUser(userEmail);
        setCredits(balances);
      } catch {
        setCredits({ tip: 0, boost: 0, spin: 0 });
      }
    };

    fetchCredits();
  }, [userEmail]);

  /* ================= MOBILE DETECT ================= */

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /* ================= MOBILE VIEW ================= */

  if (isMobile) {
    return (
      <div className="bg-[#050814] text-white h-[100dvh] w-full overflow-hidden relative">

        <div className="fixed top-2 left-2 z-[9999] rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
          LIVE_NEW_UI
        </div>

        <div className="absolute inset-0">
          <VideoStage
            token={activeToken}
            serverUrl={lkUrl}
            isMobile
            isHost={isHost}
            joined={joined}
          />
        </div>

        <LiveChatOverlay roomId={sessionId} />

        <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+90px)]">
          <LiveSupportBar
            creatorEmail={creatorEmail}
            userEmail={userEmail}
            sessionId={sessionId}
          />
          <LiveChatPanel
            roomId={sessionId}
            userEmail={userEmail}
            variant="composer"
          />
        </div>

        {isHost && !joined && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
          <div className="absolute inset-x-0 bottom-[86px] z-50 px-3">
            <button
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-black font-semibold"
              onClick={() => setJoined(true)}
            >
              Go Live
            </button>
            <p className="mt-2 text-xs text-white/60">
              Required on mobile to enable camera/microphone permissions.
            </p>
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
        <VideoStage
          token={activeToken}
          serverUrl={lkUrl}
          isMobile={false}
          isHost={isHost}
          joined={joined}
        />
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

    return (
      <ParticipantTile
        trackRef={active as any}
        className="h-full w-full"
      />
    );
  }

  return (
    <section className={isMobile ? "w-full h-full" : "w-full max-w-xl"}>
      <div className="relative w-full h-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="relative w-full h-full">
          {ready ? (
            <LiveKitRoom
  token={token}
  serverUrl={serverUrl}
  connect={shouldConnect}
  audio
  video
  onConnected={(room) => {
    console.log("ROOM CONNECTED");
    console.log("ROLE:", isHost);

    if (isHost) {
      setTimeout(async () => {
        try {
          console.log("Attempting camera enable...");
          await room.localParticipant.setCameraEnabled(true);
          await room.localParticipant.setMicrophoneEnabled(true);
          console.log("Camera enabled");
        } catch (err) {
          console.error("Camera failed:", err);
        }
      }, 300); // small Safari-safe delay
    }
  }}
  className="h-full"
>
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

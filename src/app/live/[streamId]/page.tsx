"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const GIFTS = [
  { id: "pulse",    name: "Pulse",    sparks: 10,   color: "#00e5ff" },
  { id: "amp",      name: "Amp",      sparks: 50,   color: "#00e5ff" },
  { id: "override", name: "Override", sparks: 150,  color: "#D4AF37" },
  { id: "monolith", name: "Monolith", sparks: 500,  color: "#D4AF37" },
  { id: "eclipse",  name: "Eclipse",  sparks: 1500, color: "#fff" },
];

function BoltIcon({ size = 22, color = "#D4AF37" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function GiftAsset({ id, size = 32 }: { id: string; size?: number }) {
  if (id === "pulse") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <path d="M22 4L8 22h10l-2 14 16-20H22L24 4z" fill="#00e5ff" filter="url(#gc)"/>
      <defs><filter id="gc"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    </svg>
  );
  if (id === "amp") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="none" stroke="#00e5ff" strokeWidth="2" opacity="0.4"/>
      <path d="M22 4L8 22h10l-2 14 16-20H22L24 4z" fill="#00e5ff" filter="url(#ga)"/>
      <circle cx="20" cy="20" r="8" fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.6"/>
      <defs><filter id="ga"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    </svg>
  );
  if (id === "override") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <polygon points="20,2 38,32 2,32" fill="none" stroke="#D4AF37" strokeWidth="2"/>
      <polygon points="20,8 34,30 6,30" fill="#D4AF3730"/>
      <path d="M21 12L14 24h6l-1 8 10-14h-6l1-6z" fill="#D4AF37" filter="url(#go)"/>
      <defs><filter id="go"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    </svg>
  );
  if (id === "monolith") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect x="8" y="4" width="24" height="32" rx="3" fill="none" stroke="#D4AF37" strokeWidth="2"/>
      <rect x="12" y="8" width="16" height="24" rx="2" fill="#D4AF3720"/>
      <path d="M21 12L14 24h6l-1 8 10-14h-6l1-6z" fill="#D4AF37" filter="url(#gm)"/>
      <defs><filter id="gm"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <circle cx="20" cy="20" r="12" fill="#111"/>
      <circle cx="20" cy="20" r="14" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeDasharray="4 2"/>
      <path d="M21 10L12 22h8l-1 10 12-16h-8l1-6z" fill="#fff" filter="url(#ge)"/>
      <defs><filter id="ge"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    </svg>
  );
}

export default function LivePage() {
  const params = useParams<{ streamId: string }>();
  const streamId = params?.streamId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCreator = searchParams.get('creator') === '1';
  const creatorStreamKey = searchParams.get('key');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const navigatingToBattleRef = useRef(false);
  const [stream, setStream] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const ivsMode = searchParams.get('ivs') === '1';
  const [displayName, setDisplayName] = useState<string>("viewer");
  const [viewerCount, setViewerCount] = useState(0);
  const [ended, setEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [battleAvailable, setBattleAvailable] = useState(false);


  // Gift state
  const [giftOpen, setGiftOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [giftToast, setGiftToast] = useState<string | null>(null);
  const [eclipseActive, setEclipseActive] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Battle state
  const [battleState, setBattleState] = useState<"idle" | "seeking" | "matched">("idle");
  const [battleId, setBattleId] = useState<string | null>(null);

  // Viewport state for Safari keyboard fix
  const [viewportHeight, setViewportHeight] = useState<string | number>("100dvh");

  useEffect(() => {
    if (!window.visualViewport) return;
    const handleResize = () => setViewportHeight(`${window.visualViewport?.height}px`);
    window.visualViewport.addEventListener("resize", handleResize);
    handleResize();
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, []);

  // iOS Safari keyboard dismiss fix
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    window.addEventListener('resize', resetScroll);
    window.addEventListener('focusout', resetScroll);
    return () => {
      window.removeEventListener('resize', resetScroll);
      window.removeEventListener('focusout', resetScroll);
    };
  }, []);

useEffect(() => {
  if (!userEmail || !streamId) return;
  
  const checkForBattles = async () => {
    const res = await fetch("/api/battle/available");
    const data = await res.json();
    setBattleAvailable(data.available && data.seekerEmail !== userEmail);
  };
  
  checkForBattles();
  const interval = setInterval(checkForBattles, 5000);
  return () => clearInterval(interval);
}, [userEmail, streamId]);

  useEffect(() => { return () => {}; }, []);

  useEffect(() => {
  if (!isCreator || !creatorStreamKey) return;
  let cancelled = false;
  let ivsBroadcastClient: any = null;

  const startIvsBroadcast = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: { ideal: 9/16 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (cancelled) { cameraStream.getTracks().forEach(t => t.stop()); return; }
      cameraStreamRef.current = cameraStream;

      const IVSBroadcastClient = (await import('amazon-ivs-web-broadcast')).default;
      const videoTrack = cameraStream.getVideoTracks()[0];
      const audioTrack = cameraStream.getAudioTracks()[0];
      const vw = videoTrack.getSettings().width ?? 1280;
      const vh = videoTrack.getSettings().height ?? 720;
      const isLandscape = vw > vh;

      const ingestRaw = new URLSearchParams(window.location.search).get('ingest') ?? '';
      const ingestEndpoint = decodeURIComponent(ingestRaw)
        .replace('rtmps://', '')
        .replace(':443/app/', '');

      ivsBroadcastClient = IVSBroadcastClient.create({
        streamConfig: isLandscape
          ? IVSBroadcastClient.BASIC_LANDSCAPE
          : IVSBroadcastClient.BASIC_PORTRAIT,
        ingestEndpoint,
      });

      if (videoTrack) {
        await ivsBroadcastClient.addVideoInputDevice(new MediaStream([videoTrack]), 'camera1', { index: 0 });
        ivsBroadcastClient.updateVideoDeviceComposition('camera1', {
          index: 0, x: 0, y: 0,
          width: isLandscape ? 1280 : 720,
          height: isLandscape ? 720 : 1280,
        });
      }
      if (audioTrack) {
        await ivsBroadcastClient.addAudioInputDevice(new MediaStream([audioTrack]), 'mic1');
      }

      await ivsBroadcastClient.startBroadcast(creatorStreamKey);
      console.log('[LIVE] IVS broadcast started from live page');

      try { await (navigator as any).wakeLock?.request('screen'); } catch {}
    } catch (err) {
      console.error('[LIVE] Failed to start IVS broadcast:', err);
    }
  };

  startIvsBroadcast();

  return () => {
    cancelled = true;
    if (!navigatingToBattleRef.current) {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      if (ivsBroadcastClient) {
        try { ivsBroadcastClient.stopBroadcast(); } catch {}
        try { ivsBroadcastClient.delete(); } catch {}
      }
    }
  };
}, [isCreator, creatorStreamKey]);
  
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setDisplayName(data.user?.email?.split("@")[0] ?? "viewer");
    });
  }, []);

  useEffect(() => {
    if (!streamId) return;
    fetch(`/api/live/stream/${streamId}`).then(r => r.json()).then(d => {
      if (d.stream) { setStream(d.stream); if (d.stream.status === "ENDED") setEnded(true); }
    });
  }, [streamId]);

  useEffect(() => {
    if (document.getElementById('ivs-player-script')) return;
    const script = document.createElement('script');
    script.id = 'ivs-player-script';
    script.src = 'https://player.live-video.net/1.29.0/amazon-ivs-player.min.js';
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!videoRef.current || !stream || stream.status === 'IDLE') return;
    const video = videoRef.current;
    const src = stream?.ivsPlaybackUrl ? decodeURIComponent(stream.ivsPlaybackUrl) : stream?.muxPlaybackId ? `https://stream.mux.com/${stream.muxPlaybackId}.m3u8` : null;
    if (!src) return;
    let ivsPlayer: any = null, hls: any = null;
    const initPlayer = async () => {
      if (stream?.ivsPlaybackUrl) {
        await new Promise<void>((resolve) => { const check = () => { if ((window as any).IVSPlayer) resolve(); else setTimeout(check, 100); }; check(); });
        const IVSPlayer = (window as any).IVSPlayer;
        ivsPlayer = IVSPlayer.create();
        ivsPlayer.attachHTMLVideoElement(video);
        const { PlayerEventType, ErrorType } = IVSPlayer;
        ivsPlayer.addEventListener(PlayerEventType.ERROR, (err: any) => {
          if (err.type === ErrorType.NOT_AVAILABLE) setTimeout(() => { ivsPlayer.load(src); ivsPlayer.play(); }, 3000);
        });
        ivsPlayer.load(src); ivsPlayer.play(); return;
      }
      if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = src; video.load(); video.muted = true; video.play().catch(() => {}); return; }
      const { default: Hls } = await import('hls.js');
      if (Hls.isSupported()) { hls = new Hls({ lowLatencyMode: true }); hls.loadSource(src); hls.attachMedia(video); hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); }); }
    };
    initPlayer();
    const observer = new MutationObserver(() => { video.style.width='100%'; video.style.height='100%'; video.style.position='absolute'; video.style.inset='0'; video.style.objectFit='cover'; });
    observer.observe(video, { attributes: true, attributeFilter: ['width', 'height', 'style'] });
    return () => { observer.disconnect(); if (ivsPlayer) ivsPlayer.delete(); if (hls) hls.destroy(); video.pause(); video.removeAttribute('src'); video.load(); };
  }, [stream?.muxPlaybackId, stream?.ivsPlaybackUrl, stream?.status]);

  useEffect(() => {
    if (!streamId || stream?.status === 'ACTIVE') return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/live/stream/${streamId}`);
      const data = await res.json();
      if (data.stream) { setStream(data.stream); if (data.stream.status === 'ACTIVE') clearInterval(interval); }
    }, 10000);
    return () => clearInterval(interval);
  }, [streamId, stream?.status]);

  // Realtime chat + gift events
  useEffect(() => {
    if (!streamId) return;
    const supabase = createSupabaseBrowserClient();
    supabase.from("live_chat_messages").select("*").eq("room_id", streamId).order("created_at", { ascending: true }).limit(50).then(({ data }) => { if (data) setMessages(data); });
    const channel = supabase.channel(`live:${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `room_id=eq.${streamId}` }, (payload) => {
        setMessages((prev) => [...prev.slice(-99), payload.new]);
      })
      .on("broadcast", { event: "gift" }, (payload) => {
        if (payload.payload?.giftId === "eclipse") {
          setEclipseActive(true);
          setTimeout(() => setEclipseActive(false), 3000);
        }
      })
      .on("broadcast", { event: "battle_matched" }, (payload) => {
        setBattleId(payload.payload.battleId);
        setBattleState("matched");
        navigatingToBattleRef.current = true;
        router.push(`/battle/${payload.payload.battleId}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  // scrollIntoView removed — it breaks mobile Safari layout

  const sendMessage = async () => {
    if (!chatInput.trim() || !streamId) return;

    const newMsg = {
      id: `temp-${Date.now()}`,
      room_id: streamId,
      user_email: userEmail,
      display_name: displayName,
      message: chatInput.trim(),
    };

    setMessages((prev) => [...prev.slice(-99), newMsg]);
    setChatInput("");
    // Blur input to dismiss keyboard on mobile
if (document.activeElement instanceof HTMLElement) {
  document.activeElement.blur();
}

    const supabase = createSupabaseBrowserClient();
    await supabase.from("live_chat_messages").insert({
      room_id: streamId,
      user_email: userEmail,
      display_name: displayName,
      message: newMsg.message,
    });
  };

  const endStream = async () => {
    await fetch("/api/live/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ streamId }) });
    router.push("/public-feed");
  };

  const battleIdRef = useRef<string | null>(null);
  const battleStateRef = useRef<"idle" | "seeking" | "matched">("idle");

  useEffect(() => { battleIdRef.current = battleId; }, [battleId]);
  useEffect(() => { battleStateRef.current = battleState; }, [battleState]);

  // Polling fallback — uses refs not state to avoid stale closures
  useEffect(() => {
    const poll = setInterval(async () => {
      if (battleStateRef.current !== "seeking" || !battleIdRef.current) return;
      try {
        const res = await fetch(`/api/battle/${battleIdRef.current}`);
        const data = await res.json();
        if (data.battle?.status === "active") {
          setBattleState("matched");
          navigatingToBattleRef.current = true;
          router.push(`/battle/${data.battle.id}`);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(poll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const seekBattle = async () => {
    if (!streamId || !userEmail) return;
    setBattleState("seeking");

    const res = await fetch("/api/battle/seek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamId }),
    });
    const data = await res.json();

    if (data.status === "matched") {
      setBattleId(data.battleId);
      setBattleState("matched");
      navigatingToBattleRef.current = true;
      router.push(`/battle/${data.battleId}`);
    } else if (data.status === "seeking") {
      setBattleId(data.battleId);
      // Wait for match via realtime or polling
    }
  };

  const sendGift = async (gift: typeof GIFTS[0]) => {
  setGiftOpen(false);

  // Show toast immediately — don't wait for API
  setGiftToast(`${gift.name} sent to ${stream?.displayName ?? "creator"}`);
  setTimeout(() => setGiftToast(null), 2500);

  // Eclipse animation immediately
  if (gift.id === "eclipse" && streamId) {
    const supabase = createSupabaseBrowserClient();
    supabase.channel(`live:${streamId}`).send({
      type: "broadcast", event: "gift",
      payload: { giftId: "eclipse", senderName: displayName },
    });
    setEclipseActive(true);
    setTimeout(() => setEclipseActive(false), 3000);
  }

  // Fire API in background — don't await
  if (!stream?.creatorEmail) return;
  fetch("/api/live/gift", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      giftId: gift.id,
      streamId,
      creatorEmail: stream.creatorEmail,
    }),
  }).then(r => r.json()).then(data => {
    if (data.error === "insufficient_sparks") {
      setGiftToast(null);
      setTopUpOpen(true);
    }
  }).catch(console.error);
};

  const handleGiftPressStart = () => {
    longPressTimer.current = setTimeout(() => { setTopUpOpen(true); setGiftOpen(false); }, 600);
  };
  const handleGiftPressEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

 return (
    <div style={{
      position: "relative",
      height: "100dvh", width: "100vw",
      background: "#000",
      overflow: "hidden"
    }}>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes livePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.75); } }
        @keyframes commentFloat {
        0% { opacity: 0; transform: translateX(-20px); }
        15% { opacity: 1; transform: translateX(0); }
        100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes giftSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes eclipseExpand { 0% { transform: scale(0); opacity: 0; } 40% { opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 8px rgba(212,175,55,0.4); } 50% { box-shadow: 0 0 20px rgba(212,175,55,0.7), 0 0 40px rgba(212,175,55,0.2); } }
      `}</style>

      {/* ── FULL SCREEN VIDEO ── */}
      <video ref={videoRef} autoPlay playsInline muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#000" }} />

      {/* Bottom gradient */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)", pointerEvents: "none", zIndex: 1 }} />

      {/* REVOLVR watermark — subtle top center */}
      <div style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 5, pointerEvents: "none" }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "4px", color: "rgba(255,255,255,0.12)", fontWeight: 600 }}>REVOLVR</span>
      </div>

      {/* Eclipse overlay */}
      {eclipseActive && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", pointerEvents: "none" }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", border: "3px solid #00e5ff", boxShadow: "0 0 60px #00e5ff, 0 0 120px #00e5ff40", animation: "eclipseExpand 3s ease-out forwards" }} />
          <div style={{ position: "absolute", color: "#00e5ff", fontSize: 13, fontFamily: "monospace", letterSpacing: "0.2em", marginTop: 180 }}>ECLIPSE</div>
        </div>
      )}

      {/* Stream ended */}
      {ended && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📴</div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>Stream ended</div>
          </div>
        </div>
      )}

      {/* ── TOP: Back + Unmute only ── */}
      <button onClick={() => router.back()} style={{
        position: "absolute", top: 16, left: 16,
        background: "rgba(0,0,0,0.3)", border: "none",
        color: "#fff", fontSize: 20, width: 34, height: 34,
        borderRadius: "50%", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 30, backdropFilter: "blur(4px)",
      }}>‹</button>

      {isMuted && (
        <button onClick={() => { if (videoRef.current) { videoRef.current.muted = false; setIsMuted(false); } }} style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff", fontSize: 11, fontWeight: 600,
          padding: "6px 12px", borderRadius: 20, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 5,
          zIndex: 30, backdropFilter: "blur(6px)",
        }}>🔇 Tap to unmute</button>
      )}

      {/* ── COMMENTS ── */}
      <div style={{
        position: "absolute", left: 14, right: 80,
        bottom: 150, zIndex: 20,
        pointerEvents: "none",
        display: "flex", flexDirection: "column",
        gap: 6,
      }}>
        {messages.slice(-5).map((msg, i) => (
          <div key={msg.id ?? i} style={{
            display: "flex", gap: 5, alignItems: "baseline",
            background: "rgba(0,0,0,0.3)",
            borderRadius: 14, padding: "5px 10px",
            width: "fit-content",
            maxWidth: "100%",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#00e5ff", flexShrink: 0 }}>{msg.display_name ?? msg.user_email?.split("@")[0] ?? "viewer"}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>{msg.message}</span>
          </div>
        ))}
      </div>

      {/* ── GIFT PICKER — floats above bottom bar ── */}
      {giftOpen && (
        <div style={{
          position: "absolute", right: 14, bottom: 155, zIndex: 40,
          display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end",
        }}>
          {[...GIFTS].reverse().map((gift, i) => (
            <button key={gift.id} onClick={() => sendGift(gift)} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(0,0,0,0.88)", border: `1px solid ${gift.color}30`,
              borderRadius: 16, padding: "8px 12px 8px 8px", cursor: "pointer",
              animation: `giftSlideUp 0.2s ease-out ${i * 0.04}s both`,
              backdropFilter: "blur(12px)", minWidth: 150,
            }}>
              <GiftAsset id={gift.id} size={32} />
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.05em" }}>{gift.name.toUpperCase()}</span>
                <span style={{ color: gift.color, fontSize: 10, fontFamily: "monospace" }}>{gift.sparks}⚡</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Battle available — subtle notification */}
      {battleAvailable && battleState === "idle" && !ended && stream?.creatorEmail === userEmail && (
        <div style={{
          position: "absolute", bottom: 155, left: 14,
          background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.4)",
          borderRadius: 4, padding: "4px 10px", zIndex: 25,
          display: "flex", alignItems: "center", gap: 5,
          animation: "livePulse 1.5s ease-in-out infinite",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#D4AF37" }} />
          <span style={{ color: "#D4AF37", fontSize: 9, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em" }}>BATTLE AVAILABLE</span>
        </div>
      )}

      {/* ── COMPACT BOTTOM BAR ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        zIndex: 20, padding: "0 14px calc(20px + env(safe-area-inset-bottom))",
        display: "flex", flexDirection: "column", gap: 6,
      }}>

        {/* Row 1: LIVE badge + viewer count ... End button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!ended && (
              <>
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "rgba(229,0,76,0.85)", borderRadius: 4,
                  padding: "2px 8px",
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", animation: "livePulse 1.4s ease-in-out infinite" }} />
                  <span style={{ color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em" }}>LIVE</span>
                </div>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace" }}>{viewerCount}</span>
              </>
            )}
          </div>
          {!ended && stream?.creatorEmail === userEmail && (
            <button onClick={endStream} style={{
              background: "rgba(229,0,76,0.85)", border: "none",
              color: "#fff", fontSize: 10, fontWeight: 800,
              padding: "4px 14px", borderRadius: 4, cursor: "pointer",
              letterSpacing: "0.08em",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff" }} />
              END
            </button>
          )}
        </div>

        {/* Row 2: Creator name ... Battle button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {stream && (
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
                {stream.displayName ?? stream.creatorEmail?.split("@")[0]}
              </span>
            )}
            {stream?.handle && (
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "monospace" }}>@{stream.handle}</span>
            )}
          </div>
          {!ended && stream?.creatorEmail === userEmail && battleState === "idle" && (
            <button onClick={seekBattle} style={{
              background: "#D4AF37", border: "none",
              color: "#000", fontSize: 10, fontWeight: 800,
              padding: "5px 14px", borderRadius: 4, cursor: "pointer",
              letterSpacing: "0.08em",
              display: "flex", alignItems: "center", gap: 5,
              boxShadow: "0 0 14px rgba(212,175,55,0.5)",
            }}>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="#000"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>
              BATTLE
            </button>
          )}
          {!ended && stream?.creatorEmail === userEmail && battleState === "seeking" && (
            <div style={{
              background: "rgba(212,175,55,0.15)",
              border: "1px solid rgba(212,175,55,0.4)",
              color: "#D4AF37", fontSize: 10, fontFamily: "monospace",
              padding: "5px 14px", borderRadius: 4, letterSpacing: "0.1em",
              fontWeight: 700,
            }}>SEEKING…</div>
          )}
        </div>

        {/* Row 3: Avatar + Chat input + Gift bolt + Send */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Avatar */}
          {(stream?.avatarUrl || stream?.avatarLiveUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stream?.avatarUrl ?? stream?.avatarLiveUrl}
              alt=""
              style={{
                width: 32, height: 32, borderRadius: "50%",
                objectFit: "cover", flexShrink: 0,
                border: "1.5px solid rgba(255,255,255,0.2)",
              }}
            />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)", flexShrink: 0,
            }} />
          )}

          {/* Chat input */}
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            
            placeholder="Say something..."
            style={{
              flex: 1, background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 20, color: "#fff", fontSize: 16,
              padding: "8px 14px", outline: "none",
              minWidth: 0,
            }}
          />

          {/* Gift bolt */}
          <button
            onClick={() => { if (!topUpOpen) setGiftOpen(prev => !prev); setTopUpOpen(false); }}
            onMouseDown={handleGiftPressStart} onMouseUp={handleGiftPressEnd}
            onTouchStart={handleGiftPressStart} onTouchEnd={handleGiftPressEnd}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: giftOpen ? "rgba(212,175,55,0.25)" : "rgba(0,0,0,0.4)",
              border: `1.5px solid ${giftOpen ? "#D4AF37" : "rgba(212,175,55,0.5)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
              animation: giftOpen ? "none" : "glowPulse 2.5s ease-in-out infinite",
            }}
          >
            <BoltIcon size={18} color="#D4AF37" />
          </button>

          {/* Send */}
          <button onClick={sendMessage} style={{
            background: "transparent", border: "none",
            color: "#D4AF37", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0, flexShrink: 0,
          }}>➤</button>
        </div>
      </div>

      {/* Top-up modal */}
      {topUpOpen && (
        <div style={{ position: "absolute", right: 14, bottom: 160, zIndex: 40, background: "rgba(0,0,0,0.92)", border: "1px solid rgba(0,229,255,0.3)", borderRadius: 16, padding: "14px 16px", backdropFilter: "blur(12px)", minWidth: 200 }}>
          <div style={{ color: "#00e5ff", fontSize: 11, fontFamily: "monospace", letterSpacing: "0.15em", marginBottom: 10 }}>TOP UP SPARKS</div>
          {[{ sparks: 100, price: "$2.99" }, { sparks: 300, price: "$7.99" }, { sparks: 750, price: "$17.99" }, { sparks: 2000, price: "$39.99" }].map(b => (
            <button key={b.sparks} onClick={() => { setTopUpOpen(false); router.push("/spark/buy"); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", marginBottom: 6, color: "#fff" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{b.sparks} ⚡</span>
              <span style={{ fontSize: 12, color: "#D4AF37" }}>{b.price}</span>
            </button>
          ))}
          <button onClick={() => setTopUpOpen(false)} style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, background: "none", border: "none", cursor: "pointer", width: "100%", marginTop: 4 }}>Cancel</button>
        </div>
      )}

      {/* Gift toast */}
      {giftToast && (
        <div style={{ position: "absolute", bottom: 160, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.8)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 20, padding: "7px 18px", color: "#D4AF37", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.08em", zIndex: 50, animation: "toastIn 0.2s ease-out", whiteSpace: "nowrap" }}>
          ⚡ {giftToast}
        </div>
      )}

      {/* Tap outside to close */}
      {(giftOpen || topUpOpen) && <div style={{ position: "absolute", inset: 0, zIndex: 25 }} onClick={() => { setGiftOpen(false); setTopUpOpen(false); }} />}
    </div>
  );
}
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
    let wakeLock: any = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (mediaRecorderRef.current?.state === 'inactive') mediaRecorderRef.current.start(100);
      }
    };

    const startStreaming = async () => {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user', frameRate: { ideal: 30 } },
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
        });
        cameraStreamRef.current = cameraStream;
        try { wakeLock = await (navigator as any).wakeLock?.request('screen'); } catch {}
        const broadcastUrl = process.env.NEXT_PUBLIC_BROADCAST_URL;
        if (!broadcastUrl) return;
        const ws = new WebSocket(`${broadcastUrl}?key=${creatorStreamKey}`);
        wsRef.current = ws;
        ws.onopen = () => {
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm';
          const mr = new MediaRecorder(cameraStream, { mimeType, videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 });
          mediaRecorderRef.current = mr;
          mr.ondataavailable = (e) => { if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data); };
          mr.start(100);
          document.addEventListener('visibilitychange', handleVisibilityChange);
          heartbeat = setInterval(() => { if (mediaRecorderRef.current?.state === 'inactive') mediaRecorderRef.current.start(100); }, 2000);
        };
        ws.onerror = (err) => console.error('WS error:', err);
      } catch (err) { console.error('Failed to start streaming:', err); }
    };

    startStreaming();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (heartbeat) clearInterval(heartbeat);
      wakeLock?.release();
      mediaRecorderRef.current?.stop();
      wsRef.current?.close();
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
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
        router.push(`/battle/${payload.payload.battleId}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !streamId) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.from("live_chat_messages").insert({ room_id: streamId, user_email: userEmail, display_name: displayName, message: chatInput.trim() });
    setChatInput("");
  };

  const endStream = async () => {
    await fetch("/api/live/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ streamId }) });
    router.push("/public-feed");
  };

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
      router.push(`/battle/${data.battleId}`);
    } else if (data.status === "seeking") {
      setBattleId(data.battleId);
      // Wait for match via realtime
    }
  };

  useEffect(() => {
    if (battleState !== "seeking" || !battleId) return;

    const poll = setInterval(async () => {
      const res = await fetch(`/api/battle/${battleId}`);
      const data = await res.json();
      if (data.battle?.status === "active") {
        clearInterval(poll);
        setBattleState("matched");
        router.push(`/battle/${data.battle.id}`);
      }
    }, 2000);

    return () => clearInterval(poll);
  }, [battleState, battleId, router]);

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
    <div style={{ height: "100dvh", width: "100%", maxWidth: 420, margin: "0 auto", background: "#000", position: "relative", overflow: "hidden" }}>

      <style>{`
        @keyframes livePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.75); } }
        @keyframes commentDrift { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes giftSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes eclipseExpand { 0% { transform: scale(0); opacity: 0; } 40% { opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Video */}
      <video ref={videoRef} autoPlay playsInline muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#000" }} />

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

      {/* Creator avatar */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={stream?.avatarLiveUrl ?? stream?.avatarUrl ?? `/character_${stream?.characterId ?? 1}.png`} alt="" style={{ position: "absolute", top: 0, left: 0, height: "160px", width: "auto", objectFit: "contain", zIndex: 10, pointerEvents: "none" }} />

      {/* Back button */}
      <button onClick={() => router.back()} style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.3)", border: "none", color: "#fff", fontSize: 20, width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>‹</button>

      {/* Battle available indicator */}
      {battleAvailable && battleState === "idle" && !ended && stream?.creatorEmail === userEmail && (
        <div style={{
          position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)",
          background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.5)",
          borderRadius: 20, padding: "6px 16px", zIndex: 30,
          display: "flex", alignItems: "center", gap: 6,
          animation: "livePulse 1.5s ease-in-out infinite",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37" }} />
          <span style={{ color: "#D4AF37", fontSize: 10, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.1em" }}>
            BATTLE AVAILABLE
          </span>
        </div>
      )}

      {/* End stream + Battle buttons — top right, creator only */}
      {!ended && stream?.creatorEmail === userEmail && (
        <div style={{ position: "absolute", top: 12, right: 14, display: "flex", gap: 8, zIndex: 30 }}>
          {battleState === "idle" && (
            <button
              onClick={seekBattle}
              style={{
                background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.5)",
                color: "#D4AF37", fontSize: 11, fontWeight: 700,
                padding: "5px 13px", borderRadius: 20, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <svg width={10} height={10} viewBox="0 0 24 24" fill="#D4AF37">
                <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
              </svg>
              BATTLE
            </button>
          )}
          {battleState === "seeking" && (
            <div style={{
              background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.3)",
              color: "#D4AF37", fontSize: 10, fontFamily: "monospace",
              padding: "5px 13px", borderRadius: 20,
              letterSpacing: "0.1em",
            }}>
              SEEKING…
            </div>
          )}
          <button
            onClick={endStream}
            style={{
              background: "rgba(220,30,60,0.85)", border: "none",
              color: "#fff", fontSize: 11, fontWeight: 700,
              padding: "5px 13px", borderRadius: 20, cursor: "pointer",
            }}
          >
            End
          </button>
        </div>
      )}

      {/* Creator name + LIVE */}
      <div style={{ position: "absolute", top: 175, left: 12, display: "flex", flexDirection: "column", gap: 5, zIndex: 20 }}>
        {stream && <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>{stream.displayName ?? stream.creatorEmail?.split("@")[0]}</div>}
        {!ended && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.35)", borderRadius: 20, padding: "3px 9px 3px 7px", width: "fit-content" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#D4AF37", animation: "livePulse 1.6s ease-in-out infinite", flexShrink: 0 }} />
            <span style={{ color: "#D4AF37", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>LIVE</span>
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>{viewerCount}</span>
          </div>
        )}
      </div>

      {/* Comments — top down, fade at bottom */}
      <div style={{ position: "absolute", left: 12, top: 230, height: "42%", width: "68%", overflow: "hidden", zIndex: 20, maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)" } as React.CSSProperties}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.slice(-12).map((msg, i) => (
            <div key={msg.id ?? i} style={{ display: "flex", gap: 5, alignItems: "baseline", animation: "commentDrift 0.35s ease-out both" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#00e5ff", flexShrink: 0, lineHeight: 1.4 }}>{msg.display_name ?? msg.user_email?.split("@")[0] ?? "viewer"}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.4 }}>{msg.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Unmute */}
      {isMuted && (
        <button onClick={() => { if (videoRef.current) { videoRef.current.muted = false; setIsMuted(false); } }} style={{ position: "absolute", top: 56, right: 14, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 20, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, zIndex: 20, backdropFilter: "blur(6px)" }}>
          🔇 Tap to unmute
        </button>
      )}

      {/* Gift picker — slides up from button */}
      {giftOpen && (
        <div style={{ position: "absolute", right: 14, bottom: 125, zIndex: 40, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          {[...GIFTS].reverse().map((gift, i) => (
            <button key={gift.id} onClick={() => sendGift(gift)} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.85)", border: `1px solid ${gift.color}40`, borderRadius: 24, padding: "7px 14px 7px 10px", cursor: "pointer", animation: `giftSlideUp 0.2s ease-out ${i * 0.05}s both`, backdropFilter: "blur(10px)", minWidth: 130 }}>
              <BoltIcon size={16} color={gift.color} />
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, flex: 1, textAlign: "left" }}>{gift.name}</span>
              <span style={{ color: gift.color, fontSize: 11, fontFamily: "monospace" }}>{gift.sparks}⚡</span>
            </button>
          ))}
        </div>
      )}

      {/* Top-up floating box */}
      {topUpOpen && (
        <div style={{ position: "absolute", right: 70, bottom: 70, zIndex: 40, background: "rgba(0,0,0,0.92)", border: "1px solid rgba(0,229,255,0.3)", borderRadius: 16, padding: "14px 16px", backdropFilter: "blur(12px)", minWidth: 200 }}>
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
        <div style={{ position: "absolute", bottom: 90, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.8)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 20, padding: "7px 18px", color: "#D4AF37", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.08em", zIndex: 50, animation: "toastIn 0.2s ease-out", whiteSpace: "nowrap" }}>
          ⚡ {giftToast}
        </div>
      )}

      {/* Gift bolt button */}
      <div style={{ position: "absolute", right: 14, bottom: 70, zIndex: 30 }}>
        <button
          onClick={() => { if (!topUpOpen) setGiftOpen(prev => !prev); setTopUpOpen(false); }}
          onMouseDown={handleGiftPressStart}
          onMouseUp={handleGiftPressEnd}
          onTouchStart={handleGiftPressStart}
          onTouchEnd={handleGiftPressEnd}
          style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(212,175,55,0.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)" }}
        >
          <BoltIcon size={22} color="#D4AF37" />
        </button>
      </div>

      {/* Chat input */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 12px 20px", display: "flex", alignItems: "center", gap: 8, zIndex: 20 }}>
        <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Say something..." style={{ flex: 1, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 28, color: "#fff", fontSize: 13, padding: "10px 16px", outline: "none" }} />
        <button onClick={sendMessage} style={{ background: "transparent", border: "none", color: "#D4AF37", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "2px 4px", flexShrink: 0 }}>➤</button>
      </div>

      {/* Tap outside to close gift/topup */}
      {(giftOpen || topUpOpen) && <div style={{ position: "absolute", inset: 0, zIndex: 25 }} onClick={() => { setGiftOpen(false); setTopUpOpen(false); }} />}
    </div>
  );
}
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

// ── Gift visual assets ──────────────────────────────────────────────────────
function GiftAsset({ id, size = 40 }: { id: string; size?: number }) {
  if (id === "pulse") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <path d="M22 4L8 22h10l-2 14 16-20H22L24 4z" fill="#00e5ff" filter="url(#glow-cyan)" />
      <defs><filter id="glow-cyan"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    </svg>
  );
  if (id === "amp") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="none" stroke="#00e5ff" strokeWidth="2" opacity="0.4"/>
      <path d="M22 4L8 22h10l-2 14 16-20H22L24 4z" fill="#00e5ff" filter="url(#glow-amp)"/>
      <circle cx="20" cy="20" r="8" fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.6"/>
      <defs><filter id="glow-amp"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    </svg>
  );
  if (id === "override") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <polygon points="20,2 38,32 2,32" fill="none" stroke="#D4AF37" strokeWidth="2"/>
      <polygon points="20,8 34,30 6,30" fill="#D4AF3730"/>
      <path d="M21 12L14 24h6l-1 8 10-14h-6l1-6z" fill="#D4AF37" filter="url(#glow-gold)"/>
      <defs><filter id="glow-gold"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    </svg>
  );
  if (id === "monolith") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect x="8" y="4" width="24" height="32" rx="3" fill="none" stroke="#D4AF37" strokeWidth="2"/>
      <rect x="12" y="8" width="16" height="24" rx="2" fill="#D4AF3720"/>
      <path d="M21 12L14 24h6l-1 8 10-14h-6l1-6z" fill="#D4AF37" filter="url(#glow-mono)"/>
      <line x1="20" y1="4" x2="20" y2="2" stroke="#D4AF37" strokeWidth="2"/>
      <defs><filter id="glow-mono"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    </svg>
  );
  // eclipse
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <circle cx="20" cy="20" r="12" fill="#111"/>
      <circle cx="20" cy="20" r="14" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeDasharray="4 2"/>
      <path d="M21 10L12 22h8l-1 10 12-16h-8l1-6z" fill="#fff" filter="url(#glow-eclipse)"/>
      <defs><filter id="glow-eclipse"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    </svg>
  );
}

// ── Floating gift animation ─────────────────────────────────────────────────
type FloatingGift = { id: string; giftId: string; side: "A" | "B"; senderName: string; key: number };

function FloatingGiftEffect({ fg }: { fg: FloatingGift }) {
  return (
    <div style={{
      position: "absolute",
      left: "50%", transform: "translateX(-50%)",
      [fg.side === "A" ? "top" : "bottom"]: "10%",
      bottom: "40%",
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      animation: "giftFloat 2.5s ease-out forwards",
      pointerEvents: "none",
    }}>
      <GiftAsset id={fg.giftId} size={48} />
      <span style={{ color: "#fff", fontSize: 9, fontFamily: "monospace", opacity: 0.8 }}>{fg.senderName}</span>
    </div>
  );
}

// ── IVS Video pane ──────────────────────────────────────────────────────────
function LiveVideoPane({ stream, side, voltage }: { stream: any; side: "A" | "B"; voltage: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log(`[BATTLE-VIDEO] Side ${side}:`, {
      hasVideoRef: !!videoRef.current,
      playbackUrl: stream?.ivsPlaybackUrl ?? 'NONE',
      streamData: stream ? Object.keys(stream) : 'NO STREAM',
    });
    if (!videoRef.current || !stream?.ivsPlaybackUrl) return;
    const video = videoRef.current;
    let ivsPlayer: any = null;
    let cancelled = false;

    const init = async () => {
      await new Promise<void>((resolve) => {
        const check = () => { if ((window as any).IVSPlayer) resolve(); else setTimeout(check, 100); };
        check();
      });
      if (side === "B") await new Promise(r => setTimeout(r, 1500));
      if (cancelled) return;

      const IVSPlayer = (window as any).IVSPlayer;
      ivsPlayer = IVSPlayer.create();
      ivsPlayer.attachHTMLVideoElement(video);

      let retryCount = 0;
const maxRetries = 10;
ivsPlayer.addEventListener(IVSPlayer.PlayerEventType.ERROR, () => {
  if (cancelled || retryCount >= maxRetries) return;
  retryCount++;
  const delay = Math.min(1000 * retryCount, 5000); // 1s, 2s, 3s, 4s, 5s...
  console.log(`[BATTLE-VIDEO] Side ${side}: retry ${retryCount}/${maxRetries} in ${delay}ms`);
  setTimeout(() => {
    if (cancelled) return;
    ivsPlayer.load(decodeURIComponent(stream.ivsPlaybackUrl));
    ivsPlayer.play();
  }, delay);
});

      ivsPlayer.load(decodeURIComponent(stream.ivsPlaybackUrl));
      ivsPlayer.play();
    };

    init();
    return () => {
      cancelled = true;
      if (ivsPlayer) { try { ivsPlayer.delete(); } catch {} }
    };
  }, [stream?.ivsPlaybackUrl, side]);

  const color = side === "A" ? "#00e5ff" : "#D4AF37";

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "50%",
        position: "relative",
        background: "#0a0a0a",
        overflow: "hidden",
        flexShrink: 0,
        borderBottom: side === "A" ? "1px solid rgba(255,255,255,0.1)" : "none",
      }}
    >
      <div style={{
        position: "absolute",
        top: 0, left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.7) 100%)",
      }} />

      {(stream?.avatarLiveUrl || stream?.avatarUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={stream?.avatarLiveUrl ?? stream?.avatarUrl}
          alt=""
          style={{
            position: "absolute", top: 0,
           left: 0,
            height: 44, width: 44,
            objectFit: "cover",
            borderRadius: "0 0 10px 0",
            pointerEvents: "none",
          }}
        />
      )}

      {!stream && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.15em", marginBottom: 4 }}>WAITING FOR</div>
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.15em" }}>CHALLENGER</div>
          </div>
        </div>
      )}

      <div style={{
        position: "absolute", bottom: 8, left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        pointerEvents: "none",
      }}>
        <span style={{
          color: "#fff", fontSize: 10, fontFamily: "monospace", fontWeight: 700,
          textShadow: "0 1px 6px rgba(0,0,0,0.9)", letterSpacing: "0.06em",
          maxWidth: "88%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {stream?.displayName ?? (side === "B" ? "WAITING…" : "?")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <svg width={9} height={9} viewBox="0 0 24 24">
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill={color} />
          </svg>
          <span style={{ color, fontSize: 11, fontFamily: "monospace", fontWeight: 800 }}>+ {voltage}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Battle Page ─────────────────────────────────────────────────────────
export default function BattlePage() {
  const params = useParams<{ battleId: string }>();
  const battleId = params?.battleId;
  const router = useRouter();

  const [battle, setBattle] = useState<any>(null);
  const [streamA, setStreamA] = useState<any>(null);
  const [streamB, setStreamB] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("viewer");
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const battleRef = useRef<any>(null);

  const [giftOpen, setGiftOpen] = useState(false);
  const [giftSide, setGiftSide] = useState<"A" | "B">("A");
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);
  const [eclipseActive, setEclipseActive] = useState<"A" | "B" | null>(null);
  const giftKeyRef = useRef(0);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [battleEnded, setBattleEnded] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showBattleWelcome, setShowBattleWelcome] = useState(true);

  useEffect(() => {
    if (!showBattleWelcome || !streamA) return;
    const timer = setTimeout(() => setShowBattleWelcome(false), 4000);
    return () => clearTimeout(timer);
  }, [showBattleWelcome, streamA]);

  const GIFTS = [
    { id: "pulse",    name: "PULSE",    sparks: 10,   color: "#00e5ff", label: "10⚡" },
    { id: "amp",      name: "AMP",      sparks: 50,   color: "#00e5ff", label: "50⚡" },
    { id: "override", name: "OVERRIDE", sparks: 150,  color: "#D4AF37", label: "150⚡" },
    { id: "monolith", name: "MONOLITH", sparks: 500,  color: "#D4AF37", label: "500⚡" },
    { id: "eclipse",  name: "ECLIPSE",  sparks: 1500, color: "#fff",    label: "1500⚡" },
  ];

  // Keep battle ref in sync for use in callbacks
  useEffect(() => { battleRef.current = battle; }, [battle]);

  const spawnGift = useCallback((giftId: string, side: "A" | "B", senderName: string) => {
    const key = giftKeyRef.current++;
    const fg: FloatingGift = { id: String(key), giftId, side, senderName, key };
    setFloatingGifts(prev => [...prev, fg]);
    setTimeout(() => setFloatingGifts(prev => prev.filter(g => g.key !== key)), 2600);

    if (giftId === "eclipse") {
      setEclipseActive(side === "A" ? "B" : "A");
      setTimeout(() => setEclipseActive(null), 3000);
    }
  }, []);

  const sendGift = async (gift: typeof GIFTS[0]) => {
    setGiftOpen(false);
    spawnGift(gift.id, giftSide, displayName);

    fetch("/api/battle/gift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ giftId: gift.id, battleId, side: giftSide }),
    }).then(r => r.json()).then(data => {
      if (data.error === "insufficient_sparks") setTopUpOpen(true);
    }).catch(console.error);
  };

  const totalVoltage = (battle?.voltageA ?? 0) + (battle?.voltageB ?? 0);
  const tensionPos = totalVoltage === 0 ? 50 : Math.round(((battle?.voltageB ?? 0) / totalVoltage) * 100);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setDisplayName(data.user?.email?.split("@")[0] ?? "viewer");
    });
  }, []);

  useEffect(() => {
    if (document.getElementById('ivs-player-script')) return;
    const script = document.createElement('script');
    script.id = 'ivs-player-script';
    script.src = 'https://player.live-video.net/1.29.0/amazon-ivs-player.min.js';
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!battleId) return;
    fetch(`/api/battle/${battleId}`)
      .then(r => r.json())
      .then(async d => {
        if (!d.battle) return;
        setBattle(d.battle);
        const [a, b] = await Promise.all([
          fetch(`/api/live/stream/${d.battle.streamIdA}`).then(r => r.json()),
          d.battle.streamIdB ? fetch(`/api/live/stream/${d.battle.streamIdB}`).then(r => r.json()) : Promise.resolve(null),
        ]);
        if (a?.stream) setStreamA(a.stream);
        if (b?.stream) setStreamB(b.stream);
        setLoading(false);
      });
  }, [battleId]);

  useEffect(() => {
    if (!battleId) return;
    const supabase = createSupabaseBrowserClient();

    supabase.from("live_chat_messages").select("*")
      .eq("room_id", `battle:${battleId}`)
      .order("created_at", { ascending: true }).limit(50)
      .then(({ data }) => { if (data) setMessages(data); });

    const channel = supabase.channel(`battle:${battleId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "live_chat_messages",
        filter: `room_id=eq.battle:${battleId}`,
      }, (payload) => {
        setMessages(prev => [...prev.slice(-99), payload.new]);
      })
      .on("broadcast", { event: "voltage" }, (payload) => {
        setBattle((prev: any) => prev ? { ...prev, ...payload.payload } : prev);
      })
      .on("broadcast", { event: "gift_effect" }, (payload) => {
        spawnGift(payload.payload.giftId, payload.payload.side, payload.payload.senderName);
      })
      .on("broadcast", { event: "battle_ended" }, (payload) => {
        setBattleEnded(true);
        setWinner(payload.payload.winnerEmail);
        const b = battleRef.current;
        setTimeout(() => {
          const email = payload.payload.viewerEmail ?? null;
          if (b?.creatorEmailA && b?.streamIdA) {
            // Each device knows its own userEmail from state
            // redirect happens via the userEmail state which is set separately
          }
          const winnerStreamId = payload.payload.winnerEmail === b?.creatorEmailA ? b?.streamIdA : b?.streamIdB;
          if (winnerStreamId) router.push(`/live/${winnerStreamId}`);
          else router.push("/public-feed");
        }, 5000);
      })
      .subscribe();

    const poll = setInterval(async () => {
      const res = await fetch(`/api/battle/${battleId}`);
      const data = await res.json();
      if (data.battle) setBattle(data.battle);
    }, 5000);

    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [battleId, spawnGift]);

  // Post-battle redirect — uses userEmail state directly
  const userEmailRef = useRef<string | null>(null);
  useEffect(() => { userEmailRef.current = userEmail; }, [userEmail]);

  useEffect(() => {
    if (!battleEnded || !winner) return;
    const timer = setTimeout(() => {
      const b = battleRef.current;
      const email = userEmailRef.current;
      if (email === b?.creatorEmailA && b?.streamIdA) {
        router.push(`/live/${b.streamIdA}`);
      } else if (email === b?.creatorEmailB && b?.streamIdB) {
        router.push(`/live/${b.streamIdB}`);
      } else {
        const winnerStreamId = winner === b?.creatorEmailA ? b?.streamIdA : b?.streamIdB;
        if (winnerStreamId) router.push(`/live/${winnerStreamId}`);
        else router.push("/public-feed");
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [battleEnded, winner, router]);

  useEffect(() => {
    if (!battle?.startedAt || battle?.status !== "active") return;
    const duration = battle.durationSeconds ?? 90;
    const startedAt = new Date(battle.startedAt).getTime();
    const tick = () => {
      const remaining = duration - Math.floor((Date.now() - startedAt) / 1000);
      if (remaining <= 0) {
  setTimeLeft(0);
  clearInterval(interval);
  // Only end once
  if (!battleEnded) {
    setBattleEnded(true);
    fetch("/api/battle/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ battleId }) });
  }
  return;
}
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [battle?.startedAt, battle?.status, battle?.durationSeconds, battleId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !battleId) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.from("live_chat_messages").insert({
      room_id: `battle:${battleId}`,
      user_email: userEmail,
      display_name: displayName,
      message: chatInput.trim(),
    });
    setChatInput("");
  };

  if (loading) {
    return (
      <div style={{ height: "100dvh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#D4AF37", fontFamily: "monospace", fontSize: 11, letterSpacing: "0.2em" }}>LOADING BATTLE…</span>
      </div>
    );
  }

  return (
    <div style={{ height: "100dvh", width: "100%", maxWidth: "100vw", background: "#000", overflow: "hidden", position: "relative" }}>


      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes tensionPulse { 0%,100%{box-shadow:0 0 8px #D4AF37} 50%{box-shadow:0 0 32px #D4AF37,0 0 64px #D4AF3740} }
        @keyframes commentDrift { from{transform:translateY(-8px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes giftSlideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes giftFloat { 0%{transform:translateY(0) scale(1);opacity:1} 70%{opacity:1} 100%{transform:translateY(-140px) scale(1.3);opacity:0} }
        @keyframes eclipseFlash { 0%{opacity:0} 20%{opacity:0.7} 80%{opacity:0.5} 100%{opacity:0} }
        @keyframes winnerPop { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes tensionSurge { 0%{filter:brightness(1)} 50%{filter:brightness(1.8)} 100%{filter:brightness(1)} }
        @keyframes battleWelcomeFade { 0% { opacity: 0; } 10% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
      `}</style>

      {/* ── BATTLE WELCOME OVERLAY ── */}
      {showBattleWelcome && !battleEnded && streamA && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 90,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.65)",
          animation: "battleWelcomeFade 4s ease-in-out forwards",
          pointerEvents: "none",
        }}>
          <div style={{ textAlign: "center", padding: "0 30px" }}>
            <div style={{ color: "#D4AF37", fontSize: 10, fontFamily: "monospace", letterSpacing: "0.25em", marginBottom: 12 }}>THE CIRCUIT</div>
            <div style={{ color: "#00e5ff", fontSize: 20, fontWeight: 800, textShadow: "0 0 20px rgba(0,229,255,0.4)", marginBottom: 4 }}>
              {streamA?.displayName ?? "Creator A"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, fontWeight: 800, marginBottom: 4 }}>VS</div>
            <div style={{ color: "#D4AF37", fontSize: 20, fontWeight: 800, textShadow: "0 0 20px rgba(212,175,55,0.4)", marginBottom: 16 }}>
              {streamB?.displayName ?? "Challenger"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.05em" }}>
              Send sparks to tip the balance ⚡
            </div>
          </div>
        </div>
      )}

      {/* Eclipse overlay on targeted side */}
      {eclipseActive && (
        <div style={{
          position: "absolute",
          left: 0, right: 0,
          [eclipseActive === "A" ? "top" : "bottom"]: 0,
          height: "50%",
          background: "rgba(0,0,0,0.75)",
          zIndex: 45,
          animation: "eclipseFlash 3s ease-out forwards",
          pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ fontSize: 32, animation: "giftFloat 3s ease-out forwards" }}>🌑</div>
        </div>
      )}

      {/* Floating gift effects */}
      {floatingGifts.map(fg => <FloatingGiftEffect key={fg.key} fg={fg} />)}

      {/* Back */}
      <button onClick={() => router.back()} style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", fontSize: 20, width: 30, height: 30, borderRadius: "50%", cursor: "pointer", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>

      {/* THE CIRCUIT badge */}
      <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}>
        <div style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 20, padding: "4px 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37", animation: "livePulse 1.2s ease-in-out infinite" }} />
          <span style={{ color: "#D4AF37", fontSize: 10, fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.15em" }}>THE CIRCUIT</span>
        </div>
      </div>

      {/* Timer */}
      {timeLeft !== null && !battleEnded && (
        <div style={{
          position: "absolute", top: 14, right: 14, zIndex: 30,
          background: timeLeft <= 10 ? "rgba(220,30,60,0.9)" : "rgba(0,0,0,0.75)",
          border: `1px solid ${timeLeft <= 10 ? "rgba(220,30,60,0.8)" : "rgba(255,255,255,0.2)"}`,
          borderRadius: 20, padding: "4px 14px",
          color: "#fff", fontSize: 14, fontFamily: "monospace", fontWeight: 800,
          letterSpacing: "0.1em", transition: "all 0.3s",
          animation: timeLeft <= 10 ? "livePulse 0.5s ease-in-out infinite" : "none",
        }}>
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </div>
      )}

      {/* ── POST-BATTLE STATS SCREEN ── */}
      {battleEnded && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.98)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "0 24px" }}>

          {/* Trophy icon */}
          <div style={{ fontSize: 48, animation: "winnerPop 0.6s ease-out" }}>🏆</div>

          {/* Battle over label */}
          <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.3em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>The Circuit — Battle Complete</div>

          {/* Winner name */}
          <div style={{
            fontFamily: "monospace", fontSize: 22, fontWeight: 800,
            color: "#D4AF37", letterSpacing: "0.06em", textAlign: "center",
            animation: "winnerPop 0.6s ease-out 0.2s both",
            textShadow: "0 0 30px rgba(212,175,55,0.4)",
          }}>
            {winner === battle?.creatorEmailA ? (streamA?.displayName ?? "Creator A") : (streamB?.displayName ?? "Creator B")} WINS
          </div>

          {/* Stats card */}
          <div style={{
            width: "100%", maxWidth: 320, marginTop: 8,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, padding: "16px 20px",
            animation: "winnerPop 0.5s ease-out 0.4s both",
          }}>
            {/* Score comparison */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              {/* Creator A */}
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{
                  color: winner === battle?.creatorEmailA ? "#D4AF37" : "rgba(255,255,255,0.5)",
                  fontSize: 10, fontFamily: "monospace", marginBottom: 4, letterSpacing: "0.08em",
                  maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 auto 4px",
                }}>
                  {streamA?.displayName ?? "A"}
                </div>
                <div style={{
                  color: winner === battle?.creatorEmailA ? "#D4AF37" : "#00e5ff",
                  fontSize: 32, fontFamily: "monospace", fontWeight: 800,
                }}>
                  {battle?.voltageA ?? 0}
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "monospace" }}>VOLTAGE</div>
              </div>

              {/* VS divider */}
              <div style={{ color: "rgba(255,255,255,0.12)", fontSize: 14, fontWeight: 800, padding: "0 12px" }}>VS</div>

              {/* Creator B */}
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{
                  color: winner === battle?.creatorEmailB ? "#D4AF37" : "rgba(255,255,255,0.5)",
                  fontSize: 10, fontFamily: "monospace", marginBottom: 4, letterSpacing: "0.08em",
                  maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 auto 4px",
                }}>
                  {streamB?.displayName ?? "B"}
                </div>
                <div style={{
                  color: winner === battle?.creatorEmailB ? "#D4AF37" : "#00e5ff",
                  fontSize: 32, fontFamily: "monospace", fontWeight: 800,
                }}>
                  {battle?.voltageB ?? 0}
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "monospace" }}>VOLTAGE</div>
              </div>
            </div>

            {/* Voltage bar visual */}
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: "linear-gradient(90deg, #00e5ff, #D4AF37)",
                width: `${totalVoltage === 0 ? 50 : Math.round(((battle?.voltageA ?? 0) / totalVoltage) * 100)}%`,
                transition: "width 1s ease-out",
              }} />
            </div>

            {/* Battle stats row */}
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "#D4AF37", fontSize: 18, fontWeight: 800, fontFamily: "monospace" }}>
                  {(battle?.voltageA ?? 0) + (battle?.voltageB ?? 0)}
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, fontFamily: "monospace", letterSpacing: "0.1em", marginTop: 2 }}>TOTAL SPARKS</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, fontFamily: "monospace" }}>
                  {battle?.durationSeconds ?? 90}s
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, fontFamily: "monospace", letterSpacing: "0.1em", marginTop: 2 }}>DURATION</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "#00e5ff", fontSize: 18, fontWeight: 800, fontFamily: "monospace" }}>
                  {Math.abs((battle?.voltageA ?? 0) - (battle?.voltageB ?? 0))}
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, fontFamily: "monospace", letterSpacing: "0.1em", marginTop: 2 }}>MARGIN</div>
              </div>
            </div>
          </div>

          {/* Redirect notice */}
          <div style={{
            color: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "monospace",
            marginTop: 12, letterSpacing: "0.1em",
            animation: "livePulse 1.5s ease-in-out infinite",
          }}>
            RETURNING TO STREAM…
          </div>
        </div>
      )}

      {/* Dual live video — stacked vertically */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        position: "absolute",
        inset: 0,
        zIndex: 1,
        height: "100%",
        width: "100%",
      }}>
        <LiveVideoPane stream={streamA} side="A" voltage={battle?.voltageA ?? 0} />
        <LiveVideoPane stream={streamB} side="B" voltage={battle?.voltageB ?? 0} />
      </div>

      {/* Tension line */}
      <div style={{ position: "absolute", bottom: 52, left: 0, right: 0, height: 28, display: "flex", alignItems: "center", padding: "0 16px", background: "rgba(0,0,0,0.5)", zIndex: 10, gap: 8, backdropFilter: "blur(4px)" }}>
        <span style={{ color: "#00e5ff", fontSize: 9, fontFamily: "monospace", fontWeight: 800, minWidth: 24, textAlign: "left" }}>{battle?.voltageA ?? 0}</span>
        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${100 - tensionPos}%`, background: "linear-gradient(to right, #00e5ff, #00e5ff50)", borderRadius: 2, transition: "width 0.5s cubic-bezier(0.34,1.56,0.64,1)" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${tensionPos}%`, background: "linear-gradient(to left, #D4AF37, #D4AF3750)", borderRadius: 2, transition: "width 0.5s cubic-bezier(0.34,1.56,0.64,1)" }} />
          <div style={{ position: "absolute", top: "50%", left: `${100 - tensionPos}%`, transform: "translate(-50%, -50%)", width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 0 14px #D4AF37, 0 0 28px #D4AF3780", animation: "tensionPulse 1.5s ease-in-out infinite", transition: "left 0.5s cubic-bezier(0.34,1.56,0.64,1)", zIndex: 2 }} />
        </div>
        <span style={{ color: "#D4AF37", fontSize: 9, fontFamily: "monospace", fontWeight: 800, minWidth: 24, textAlign: "right" }}>{battle?.voltageB ?? 0}</span>
      </div>

      {/* Comments */}
      <div style={{ position: "absolute", bottom: 82, left: 0, right: 80, height: 90, overflow: "hidden", padding: "6px 12px 0", zIndex: 10, maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)" } as React.CSSProperties}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {messages.slice(-8).map((msg, i) => (
            <div key={msg.id ?? i} style={{ display: "flex", gap: 5, alignItems: "baseline", animation: "commentDrift 0.3s ease-out both" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#00e5ff", flexShrink: 0 }}>{msg.display_name ?? msg.user_email?.split("@")[0] ?? "viewer"}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{msg.message}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Gift visual picker */}
      <div style={{ position: "absolute", right: 12, bottom: 48, zIndex: 30, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        {giftOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
            {/* Side selector */}
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <button onClick={() => setGiftSide("A")} style={{ background: giftSide === "A" ? "rgba(0,229,255,0.2)" : "rgba(0,0,0,0.7)", border: `1px solid ${giftSide === "A" ? "#00e5ff" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "4px 10px", color: giftSide === "A" ? "#00e5ff" : "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "monospace", cursor: "pointer", fontWeight: 700 }}>
                {streamA?.displayName?.split(" ")[0] ?? "A"}
              </button>
              <button onClick={() => setGiftSide("B")} style={{ background: giftSide === "B" ? "rgba(212,175,55,0.2)" : "rgba(0,0,0,0.7)", border: `1px solid ${giftSide === "B" ? "#D4AF37" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "4px 10px", color: giftSide === "B" ? "#D4AF37" : "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "monospace", cursor: "pointer", fontWeight: 700 }}>
                {streamB?.displayName?.split(" ")[0] ?? "B"}
              </button>
            </div>
            {/* Gift tiles — visual icons */}
            {[...GIFTS].reverse().map((gift, i) => (
              <button key={gift.id} onClick={() => sendGift(gift)}
                style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.88)", border: `1px solid ${gift.color}30`, borderRadius: 16, padding: "8px 12px 8px 8px", cursor: "pointer", backdropFilter: "blur(12px)", animation: `giftSlideUp 0.2s ease-out ${i * 0.04}s both`, minWidth: 140 }}>
                <GiftAsset id={gift.id} size={32} />
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.05em" }}>{gift.name}</span>
                  <span style={{ color: gift.color, fontSize: 9, fontFamily: "monospace" }}>{gift.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Bolt button */}
        <button onClick={() => { setGiftOpen(prev => !prev); setTopUpOpen(false); }}
          style={{ width: 48, height: 48, borderRadius: "50%", background: giftOpen ? "rgba(212,175,55,0.2)" : "rgba(0,0,0,0.6)", border: `1px solid ${giftOpen ? "#D4AF37" : "rgba(212,175,55,0.4)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", transition: "all 0.2s" }}>
          <svg width={22} height={22} viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="#D4AF37"/></svg>
        </button>
      </div>

      {/* Top-up modal */}
      {topUpOpen && (
        <div style={{ position: "absolute", right: 70, bottom: 70, zIndex: 40, background: "rgba(0,0,0,0.95)", border: "1px solid rgba(0,229,255,0.3)", borderRadius: 16, padding: "14px 16px", backdropFilter: "blur(12px)", minWidth: 190 }}>
          <div style={{ color: "#00e5ff", fontSize: 10, fontFamily: "monospace", letterSpacing: "0.15em", marginBottom: 10 }}>TOP UP SPARKS</div>
          {[{ sparks: 100, price: "$2.99" }, { sparks: 300, price: "$7.99" }, { sparks: 750, price: "$17.99" }, { sparks: 2000, price: "$39.99" }].map(b => (
            <button key={b.sparks} onClick={() => { setTopUpOpen(false); router.push("/spark/buy"); }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", marginBottom: 6, color: "#fff" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{b.sparks} ⚡</span>
              <span style={{ fontSize: 11, color: "#D4AF37" }}>{b.price}</span>
            </button>
          ))}
          <button onClick={() => setTopUpOpen(false)} style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, background: "none", border: "none", cursor: "pointer", width: "100%", marginTop: 4 }}>Cancel</button>
        </div>
      )}

      {/* Tap outside to close */}
      {(giftOpen || topUpOpen) && <div style={{ position: "absolute", inset: 0, zIndex: 25 }} onClick={() => { setGiftOpen(false); setTopUpOpen(false); }} />}

      {/* Chat input */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 12px 12px", display: "flex", alignItems: "center", gap: 8, zIndex: 10, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)" }}>
        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Say something..." style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 28, color: "#fff", fontSize: 13, padding: "9px 16px", outline: "none" }} />
        <button onClick={sendMessage} style={{ background: "transparent", border: "none", color: "#D4AF37", fontSize: 18, cursor: "pointer" }}>➤</button>
      </div>
    </div>
  );
}
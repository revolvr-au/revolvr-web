"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

function BoltIcon({ size = 16, color = "#D4AF37" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

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

  // Tension line position — 50 = centre, 0 = full A win, 100 = full B win
  const totalVoltage = (battle?.voltageA ?? 0) + (battle?.voltageB ?? 0);
  const tensionPos = totalVoltage === 0 ? 50 : Math.round(((battle?.voltageB ?? 0) / totalVoltage) * 100);

  // Get user
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setDisplayName(data.user?.email?.split("@")[0] ?? "viewer");
    });
  }, []);

  // Load battle
  useEffect(() => {
    if (!battleId) return;
    fetch(`/api/battle/${battleId}`)
      .then(r => r.json())
      .then(async d => {
        if (!d.battle) return;
        setBattle(d.battle);
        // Load both streams
        const [a, b] = await Promise.all([
          fetch(`/api/live/stream/${d.battle.streamIdA}`).then(r => r.json()),
          d.battle.streamIdB ? fetch(`/api/live/stream/${d.battle.streamIdB}`).then(r => r.json()) : Promise.resolve(null),
        ]);
        if (a?.stream) setStreamA(a.stream);
        if (b?.stream) setStreamB(b.stream);
        setLoading(false);
      });
  }, [battleId]);

  // Realtime — voltage updates + chat
  useEffect(() => {
    if (!battleId) return;
    const supabase = createSupabaseBrowserClient();

    // Chat
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
      .subscribe();

    // Poll battle state every 5s
    const poll = setInterval(async () => {
      const res = await fetch(`/api/battle/${battleId}`);
      const data = await res.json();
      if (data.battle) setBattle(data.battle);
    }, 5000);

    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [battleId]);

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
    <div style={{ height: "100dvh", width: "100%", maxWidth: 420, margin: "0 auto", background: "#000", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes tensionPulse { 0%,100%{box-shadow:0 0 8px #D4AF37} 50%{box-shadow:0 0 24px #D4AF37, 0 0 48px #D4AF3740} }
        @keyframes commentDrift { from{transform:translateY(-8px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes glitch { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-2px)} 40%{transform:translateX(2px)} 60%{transform:translateX(-1px)} 80%{transform:translateX(1px)} }
      `}</style>

      {/* Back */}
      <button onClick={() => router.back()} style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", fontSize: 20, width: 30, height: 30, borderRadius: "50%", cursor: "pointer", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>

      {/* CIRCUIT badge */}
      <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}>
        <div style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 20, padding: "4px 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37", animation: "livePulse 1.2s ease-in-out infinite" }} />
          <span style={{ color: "#D4AF37", fontSize: 10, fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.15em" }}>THE CIRCUIT</span>
        </div>
      </div>

      {/* Dual avatar area — top half */}
      <div style={{ display: "flex", height: "45%", position: "relative" }}>

        {/* Creator A — left */}
        <div style={{ flex: 1, position: "relative", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,229,255,0.05), transparent)" }} />
          {streamA?.avatarLiveUrl || streamA?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={streamA?.avatarLiveUrl ?? streamA?.avatarUrl} alt="" style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", height: "90%", width: "auto", objectFit: "contain", filter: tensionPos > 50 ? "brightness(0.6)" : "brightness(1)" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, color: "rgba(255,255,255,0.1)" }}>?</div>
          )}
          {/* Voltage A */}
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ color: "#00e5ff", fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{streamA?.displayName ?? "Creator A"}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <BoltIcon size={12} color="#00e5ff" />
              <span style={{ color: "#00e5ff", fontSize: 13, fontFamily: "monospace", fontWeight: 800 }}>{battle?.voltageA ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Creator B — right */}
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to left, rgba(212,175,55,0.05), transparent)" }} />
          {streamB?.avatarLiveUrl || streamB?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={streamB?.avatarLiveUrl ?? streamB?.avatarUrl} alt="" style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%) scaleX(-1)", height: "90%", width: "auto", objectFit: "contain", filter: tensionPos < 50 ? "brightness(0.6)" : "brightness(1)" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, fontFamily: "monospace", letterSpacing: "0.1em" }}>{battle?.status === "pending" ? "WAITING…" : "?"}</span>
            </div>
          )}
          {/* Voltage B */}
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ color: "#D4AF37", fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{streamB?.displayName ?? (battle?.status === "pending" ? "Waiting…" : "Creator B")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <BoltIcon size={12} color="#D4AF37" />
              <span style={{ color: "#D4AF37", fontSize: 13, fontFamily: "monospace", fontWeight: 800 }}>{battle?.voltageB ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* THE CIRCUIT — tension line */}
      <div style={{ height: 32, position: "relative", display: "flex", alignItems: "center", padding: "0 16px" }}>
        {/* Track */}
        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, position: "relative", overflow: "visible" }}>
          {/* A fill — cyan */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${100 - tensionPos}%`, background: "linear-gradient(to right, #00e5ff, #00e5ff80)", borderRadius: 2, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
          {/* B fill — gold */}
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${tensionPos}%`, background: "linear-gradient(to left, #D4AF37, #D4AF3780)", borderRadius: 2, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
          {/* Node */}
          <div style={{ position: "absolute", top: "50%", left: `${100 - tensionPos}%`, transform: "translate(-50%, -50%)", width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 0 12px #D4AF37, 0 0 24px #D4AF3780", animation: "tensionPulse 1.5s ease-in-out infinite", transition: "left 0.6s cubic-bezier(0.34,1.56,0.64,1)", zIndex: 2 }} />
        </div>
      </div>

      {/* Comments */}
      <div style={{ flex: 1, overflow: "hidden", padding: "8px 12px 0", maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)" } as React.CSSProperties}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {messages.slice(-10).map((msg, i) => (
            <div key={msg.id ?? i} style={{ display: "flex", gap: 5, alignItems: "baseline", animation: "commentDrift 0.3s ease-out both" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#00e5ff", flexShrink: 0 }}>{msg.display_name ?? msg.user_email?.split("@")[0] ?? "viewer"}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{msg.message}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Chat input */}
      <div style={{ padding: "8px 12px 20px", display: "flex", alignItems: "center", gap: 8 }}>
        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Say something..." style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 28, color: "#fff", fontSize: 13, padding: "10px 16px", outline: "none" }} />
        <button onClick={sendMessage} style={{ background: "transparent", border: "none", color: "#D4AF37", fontSize: 20, cursor: "pointer" }}>➤</button>
      </div>
    </div>
  );
}
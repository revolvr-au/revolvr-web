"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

const LiveKitClient = dynamic(() => import("./LiveKitClient"), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  message: string;
  created_at: string;
};

  
export default function LiveClient({
  token,
  lkUrl,
  isMobile,
  isHost,
  roomId,
}: {
  token: string;
  lkUrl: string;
  isMobile: boolean;
  isHost: boolean;
  roomId: string;
}) {
  console.log("LIVE CLIENT V2 ACTIVE");

  const [comments, setComments] = useState<ChatMessage[]>([]);
  const [viewerCount] = useState(174);
  const [heartBurst, setHeartBurst] = useState(false);
  const [message, setMessage] = useState("");

  const lastTapRef = useRef(0);

  // 🔥 INITIAL FETCH
  useEffect(() => {
    async function loadInitial() {
      const res = await fetch(`/api/live/chat?roomId=${roomId}&limit=50`);
      const data = await res.json();
      if (data?.ok) {
        setComments(data.messages || []);
      }
    }
    loadInitial();
  }, [roomId]);

  // 🔥 REALTIME SUBSCRIPTION
  useEffect(() => {
    const channel = supabase
      .channel("live-chat-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setComments((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 600);
    }
    lastTapRef.current = now;
  }

  async function handleSend() {
    if (!message.trim()) return;

    const text = message;
    setMessage("");

    await fetch("/api/live/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, message: text }),
    });
  }

  return (
    <div className="relative w-screen h-[100dvh] bg-black overflow-hidden">

      {/* VIDEO */}
<div className="absolute inset-0 z-0 pointer-events-auto">
  <LiveKitClient
    token={token}
    lkUrl={lkUrl}
    isMobile={isMobile}
    onlySubscribed={!isHost}
  />
</div>

{/* DOUBLE TAP OVERLAY (separate layer) */}
<div
  className="absolute inset-0 z-10"
  onClick={handleTap}
/>

      {/* TOP BAR */}
      <div className="absolute top-4 left-4 ... z-50">
        <div className="w-10 h-10 rounded-full bg-white/20" />
        <div className="leading-tight">
          <div className="font-semibold text-sm">revolvr au</div>
          <div className="text-xs mt-1">
            🔴 LIVE • <span className="font-semibold">{viewerCount}</span> watching
          </div>
        </div>
      </div>

      {/* CLOSE */}
      <div className="absolute top-4 right-4 z-40">
        <button
          onClick={() => router.push("/public-feed")}
          className="text-white text-lg"
        >
          ✕
        </button>
      </div>

      {/* COMMENTS */}
      <div className="absolute left-4 bottom-28 flex flex-col gap-2 pointer-events-none z-30">
        {comments.slice(-6).map((c) => (
          <div
            key={c.id}
            className="text-white text-sm"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
          >
            <span className="font-semibold">
              {c.display_name || "user"}
            </span>{" "}
            {c.message}
          </div>
        ))}
      </div>

      {/* COMMENT BAR */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/80 to-transparent z-[100] pointer-events-auto">
        <div className="flex items-center gap-3 text-white">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-white/10 rounded-full px-4 py-2 text-sm outline-none"
          />

          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className={`text-lg ${
              message.trim() ? "opacity-100" : "opacity-30"
            }`}
          >
            ➤
          </button>
        </div>
      </div>

      {heartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-red-500 text-6xl">❤️</div>
        </div>
      )}
    </div>
  );
}
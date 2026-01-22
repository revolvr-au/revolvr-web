"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string | null;
  user_email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  message: string;
  created_at: string;
};

type ApiGetResponse =
  | { ok: true; messages: ChatMessage[] }
  | { error: string };

const EXPIRY_MS = 15_000;

function nowMs() {
  return Date.now();
}

function msgAgeMs(m: ChatMessage) {
  const t = new Date(m.created_at).getTime();
  if (!Number.isFinite(t)) return 0;
  return nowMs() - t;
}

function isAlive(m: ChatMessage) {
  return msgAgeMs(m) <= EXPIRY_MS;
}

function displayNameFor(m: ChatMessage) {
  const raw = (m.display_name || m.user_email || "someone").trim();
  if (!raw) return "someone";
  // If it's an email, show prefix
  if (raw.includes("@")) return raw.split("@")[0] || raw;
  return raw;
}

export default function LiveChatOverlay({
  roomId,
  max = 6,
}: {
  roomId: string;
  max?: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const pruneTimer = useRef<any>(null);

  const visible = useMemo(() => {
    const alive = messages.filter(isAlive);
    // keep latest N
    return alive.slice(Math.max(0, alive.length - max));
  }, [messages, max]);

  async function fetchRecent(signal?: AbortSignal) {
    if (!roomId) return;

    try {
      const res = await fetch(
        `/api/live/chat?roomId=${encodeURIComponent(roomId)}&limit=40`,
        { method: "GET", signal, cache: "no-store" }
      );

      const json = (await res.json().catch(() => ({}))) as ApiGetResponse;
      if (!res.ok || "error" in json) return;

      const incoming = Array.isArray(json.messages) ? json.messages : [];
      setMessages(incoming.filter(isAlive));
    } catch {
      // ignore
    }
  }

  function schedulePrune() {
    if (pruneTimer.current) clearInterval(pruneTimer.current);
    pruneTimer.current = setInterval(() => {
      setMessages((prev) => prev.filter(isAlive));
    }, 1000);
  }

  useEffect(() => {
    const ac = new AbortController();
    fetchRecent(ac.signal);
    schedulePrune();

    return () => {
      ac.abort();
      if (pruneTimer.current) clearInterval(pruneTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`live-chat-overlay:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          const msg = payload?.new as ChatMessage | undefined;
          if (!msg?.id) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const next = [...prev, msg].filter(isAlive);
            // keep bounded history
            return next.length > 60 ? next.slice(next.length - 60) : next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // No UI if nothing to show
  if (!visible.length) return null;

  return (
    <div className="pointer-events-none w-full">
      <div className="flex flex-col gap-2">
        {visible.map((m) => {
          const age = msgAgeMs(m);
          const left = Math.max(0, EXPIRY_MS - age);
          const opacity = Math.max(0.15, Math.min(1, left / EXPIRY_MS));

          return (
            <div
              key={m.id}
              style={{ opacity }}
              className="max-w-[85%] rounded-2xl border border-white/10 bg-black/35 backdrop-blur px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
            >
              <div className="text-[11px] text-white/65 font-medium">
                {displayNameFor(m)}
              </div>
              <div className="text-sm text-white/90 leading-snug break-words">
                {m.message}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

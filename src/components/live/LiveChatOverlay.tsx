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

function nameFor(m: ChatMessage) {
  const raw = m.display_name || (m.user_email ? m.user_email.split("@")[0] : "");
  return raw || "user";
}

export default function LiveChatOverlay({
  roomId,
  ttlMs = 15000,
}: {
  roomId: string;
  ttlMs?: number;
}) {
  const [items, setItems] = useState<Array<ChatMessage & { _seenAt: number }>>(
    []
  );

  const roomKey = useMemo(() => String(roomId || ""), [roomId]);
  const cleanupTimer = useRef<number | null>(null);

  function upsert(msg: ChatMessage) {
    const seenAt = Date.now();

    setItems((prev) => {
      if (!msg?.id) return prev;
      if (prev.some((x) => x.id === msg.id)) return prev;

      const next = [...prev, { ...msg, _seenAt: seenAt }];
      // keep last 30
      return next.length > 30 ? next.slice(next.length - 30) : next;
    });
  }

  async function fetchLatest(signal?: AbortSignal) {
    if (!roomKey) return;
    try {
      const res = await fetch(
        `/api/live/chat?roomId=${encodeURIComponent(roomKey)}&limit=40`,
        { method: "GET", cache: "no-store", signal }
      );
      const json = (await res.json().catch(() => ({}))) as ApiGetResponse;
      if (!res.ok || ("error" in json && json.error)) return;

      const incoming = Array.isArray((json as any).messages)
        ? ((json as any).messages as ChatMessage[])
        : [];

      // Only show the most recent few, with a fresh _seenAt so they expire naturally
      const now = Date.now();
      const recent = incoming.slice(-10).map((m) => ({ ...m, _seenAt: now }));

      setItems((prev) => {
        const existingIds = new Set(prev.map((x) => x.id));
        const merged = [...prev];
        for (const m of recent) {
          if (!existingIds.has(m.id)) merged.push(m);
        }
        return merged.length > 30 ? merged.slice(merged.length - 30) : merged;
      });
    } catch {
      // ignore
    }
  }

  // Expire messages
  useEffect(() => {
    if (cleanupTimer.current) window.clearInterval(cleanupTimer.current);
    cleanupTimer.current = window.setInterval(() => {
      const cutoff = Date.now() - ttlMs;
      setItems((prev) => prev.filter((m) => m._seenAt >= cutoff));
    }, 400);

    return () => {
      if (cleanupTimer.current) window.clearInterval(cleanupTimer.current);
      cleanupTimer.current = null;
    };
  }, [ttlMs]);

  // 1) Listen for local "sent message" events (instant UI feedback)
  useEffect(() => {
    const onInsert = (e: Event) => {
      const ce = e as CustomEvent;
      const msg = ce?.detail as ChatMessage | undefined;
      if (!msg?.id) return;
      if (String(msg.room_id) !== roomKey) return;
      upsert(msg);
    };

    window.addEventListener("livechat:insert", onInsert as any);
    return () => window.removeEventListener("livechat:insert", onInsert as any);
  }, [roomKey]);

  // 2) Realtime subscription
  useEffect(() => {
    if (!roomKey) return;

    const channel = supabase
      .channel(`live-chat-overlay:${roomKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `room_id=eq.${roomKey}`,
        },
        (payload: any) => {
          const msg = payload?.new as ChatMessage | undefined;
          if (!msg?.id) return;
          upsert(msg);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomKey]);

  // 3) Safety poll (covers any realtime edge cases)
  useEffect(() => {
    if (!roomKey) return;
    const ac = new AbortController();

    fetchLatest(ac.signal);
    const t = window.setInterval(() => fetchLatest(ac.signal), 1500);

    return () => {
      window.clearInterval(t);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomKey]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-40"
    >
      {/* Stack messages above the composer + bottom rail */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-[calc(env(safe-area-inset-bottom)+170px)]">
        <div className="flex flex-col gap-2">
          {items.map((m) => (
            <div
              key={m.id}
              className="w-fit max-w-[88%] rounded-none border-0 bg-black/45  px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
            >
              <div className="text-[11px] text-white/70 drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
                {nameFor(m)}
              </div>
              <div className="text-sm text-white/90 leading-snug break-words">
                {m.message}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

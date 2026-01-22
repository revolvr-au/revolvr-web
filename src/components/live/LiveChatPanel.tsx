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

type ApiPostResponse =
  | { ok: true; message: ChatMessage }
  | { ok: true }
  | { error: string };

const EXPIRE_MS = 15_000;
const MAX_STACK = 14;

function safeTimeMs(iso: string) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Date.now();
}

function remainingMs(createdAtIso: string) {
  const age = Date.now() - safeTimeMs(createdAtIso);
  return EXPIRE_MS - age;
}

export default function LiveChatPanel({
  roomId,
  liveHrefForRedirect,
  userEmail,
  variant = "panel",
}: {
  roomId: string;
  liveHrefForRedirect: string;
  userEmail: string | null;
  variant?: "panel" | "overlay";
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState("");

  const timersRef = useRef<Map<string, number>>(new Map());
  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend =
    !!userEmail && text.trim().length > 0 && text.trim().length <= 280;

  const loginHref = useMemo(() => {
    return `/login?redirectTo=${encodeURIComponent(liveHrefForRedirect)}`;
  }, [liveHrefForRedirect]);

  const clearTimer = (id: string) => {
    const t = timersRef.current.get(id);
    if (t) window.clearTimeout(t);
    timersRef.current.delete(id);
  };

  const scheduleExpiry = (msg: ChatMessage) => {
    if (!msg?.id) return;

    // If already scheduled, keep existing timer.
    if (timersRef.current.has(msg.id)) return;

    const ms = remainingMs(msg.created_at);
    if (ms <= 0) {
      // Already expired
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      return;
    }

    const t = window.setTimeout(() => {
      timersRef.current.delete(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    }, ms);

    timersRef.current.set(msg.id, t);
  };

  const upsertMessage = (msg: ChatMessage) => {
    if (!msg?.id) return;

    // Ignore messages already expired.
    if (remainingMs(msg.created_at) <= 0) return;

    setMessages((prev) => {
      const existsIdx = prev.findIndex((m) => m.id === msg.id);
      let next: ChatMessage[];

      if (existsIdx >= 0) {
        next = prev.slice();
        next[existsIdx] = msg;
      } else {
        next = [...prev, msg];
      }

      // Keep in chronological order
      next.sort((a, b) => safeTimeMs(a.created_at) - safeTimeMs(b.created_at));

      // Only keep last MAX_STACK messages (TikTok feel)
      if (next.length > MAX_STACK) next = next.slice(next.length - MAX_STACK);

      return next;
    });

    scheduleExpiry(msg);

    queueMicrotask(() => {
      const el = listRef.current;
      if (!el) return;
      // Always stick to bottom
      el.scrollTop = el.scrollHeight;
    });
  };

  async function fetchMessages(signal?: AbortSignal) {
    try {
      setErr(null);

      const res = await fetch(
        `/api/live/chat?roomId=${encodeURIComponent(roomId)}&limit=80`,
        { method: "GET", signal, cache: "no-store" }
      );

      const json = (await res.json().catch(() => ({}))) as ApiGetResponse;

      if (!res.ok || "error" in json) {
        throw new Error(
          ("error" in json && json.error) || "Failed to load chat"
        );
      }

      const incomingAll = Array.isArray(json.messages) ? json.messages : [];

      // Only show messages still within expiry window (live-only feel)
      const incoming = incomingAll.filter((m) => remainingMs(m.created_at) > 0);

      setMessages(() => {
        const trimmed = incoming
          .slice()
          .sort((a, b) => safeTimeMs(a.created_at) - safeTimeMs(b.created_at))
          .slice(-MAX_STACK);

        // schedule expiry for anything we display
        for (const m of trimmed) scheduleExpiry(m);

        return trimmed;
      });
    } catch (e: any) {
      if (String(e?.name) === "AbortError") return;
      setErr(String(e?.message || e || "Chat failed"));
    } finally {
      setLoading(false);
    }
  }

  // Initial load (one time per room)
  useEffect(() => {
    setLoading(true);
    const ac = new AbortController();
    fetchMessages(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Realtime: receive messages instantly
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`live-chat:${roomId}`)
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
          upsertMessage(msg);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Cleanup timers on unmount / room change
  useEffect(() => {
    return () => {
      for (const [, t] of timersRef.current) window.clearTimeout(t);
      timersRef.current.clear();
    };
  }, [roomId]);

  async function sendMessage() {
    if (!canSend || posting) return;

    const msgText = text.trim();
    setPosting(true);
    setErr(null);

    // Optimistic
    const optimisticId = `optimistic-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const optimistic: ChatMessage = {
      id: optimisticId,
      room_id: roomId,
      user_id: null,
      user_email: userEmail,
      display_name: userEmail ? userEmail.split("@")[0] : "you",
      avatar_url: null,
      message: msgText,
      created_at: nowIso,
    };

    upsertMessage(optimistic);
    setText("");

    try {
      const res = await fetch("/api/live/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, message: msgText }),
      });

      const json = (await res.json().catch(() => ({}))) as ApiPostResponse;

      if (!res.ok || "error" in json) {
        throw new Error(
          ("error" in json && json.error) || "Failed to send message"
        );
      }

      // If server returns inserted message, replace optimistic to avoid duplicates/jump.
      if ("message" in json && json.message?.id) {
        const saved = json.message;

        // Clear optimistic timer, remove optimistic entry, insert saved.
        clearTimer(optimisticId);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        upsertMessage(saved);
        return;
      }

      // Fallback: refresh once
      await fetchMessages();
    } catch (e: any) {
      setErr(String(e?.message || e || "Chat send failed"));
      clearTimer(optimisticId);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      data-live-chat="1"
      className={
        variant === "overlay"
          ? "w-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-3 flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.03)] max-h-[42vh]"
          : "h-[28vh] sm:h-[60vh] lg:h-[calc(100vh-140px)] rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-3 flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
      }
    >
      <style jsx>{`
        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(10px);
            filter: blur(1px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="text-sm font-semibold text-white/90">Live chat</div>
          <div className="text-[11px] text-white/45">
            Room{" "}
            <span className="font-mono text-white/65">{roomId.slice(0, 10)}…</span>
          </div>
        </div>

        {!userEmail ? (
          <a
            href={loginHref}
            className="text-[11px] px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white/80"
          >
            Login
          </a>
        ) : (
          <div className="text-[11px] text-white/55 truncate max-w-[160px] text-right">
            {userEmail}
          </div>
        )}
      </div>

      {/* Stack */}
      <div
        ref={listRef}
        className="mt-3 flex-1 min-h-0 overflow-hidden flex flex-col justify-end gap-2 px-1"
      >
        {loading ? (
          <div className="text-xs text-white/45">Loading chat…</div>
        ) : err ? (
          <div className="text-xs text-red-200/90">{err}</div>
        ) : messages.length === 0 ? (
          <div className="text-xs text-white/45">Say something…</div>
        ) : (
          messages.map((m) => {
            const name = (m.display_name || m.user_email || "user").trim();
            const isOptimistic = m.id.startsWith("optimistic-");

            // Subtle fade for older entries (even before expiry)
            const age = Date.now() - safeTimeMs(m.created_at);
            const fade = Math.max(0.35, 1 - age / EXPIRE_MS);

            return (
              <div
                key={m.id}
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2"
                style={{
                  animation: "riseIn 220ms ease-out",
                  opacity: fade,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-white/70 truncate max-w-[70%]">
                    <span className="text-white/85 font-medium">{name}</span>
                    {isOptimistic ? (
                      <span className="ml-2 text-[10px] text-white/35">
                        sending…
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[10px] text-white/35">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <div className="text-[13px] leading-snug text-white/90 mt-1 break-words">
                  {m.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="mt-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={userEmail ? "Type a message…" : "Login to chat…"}
          disabled={!userEmail || posting}
          maxLength={280}
          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 disabled:opacity-60"
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />

        <button
          type="button"
          disabled={!canSend || posting}
          onClick={sendMessage}
          className="rounded-xl px-3 py-2 text-sm font-medium border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <div className="mt-2 text-[10px] text-white/35 px-1">
        Messages disappear after 15 seconds.
      </div>
    </div>
  );
}

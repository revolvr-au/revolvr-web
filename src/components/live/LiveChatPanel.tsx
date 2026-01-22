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

const EXPIRY_MS = 15_000;

function isAlive(m: ChatMessage) {
  const t = new Date(m.created_at).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t <= EXPIRY_MS;
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
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
  variant?: "panel" | "overlay" | "composer";
}) {
  const isComposer = variant === "composer";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(!isComposer);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState("");

  const listRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<string | null>(null);

  const canSend =
    !!userEmail && text.trim().length > 0 && text.trim().length <= 280;

  const loginHref = useMemo(() => {
    return `/login?redirectTo=${encodeURIComponent(liveHrefForRedirect)}`;
  }, [liveHrefForRedirect]);

  async function fetchMessages(signal?: AbortSignal) {
    if (isComposer) return;

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

      const incoming = (Array.isArray(json.messages) ? json.messages : []).filter(
        isAlive
      );

      setMessages((prev) => {
        const incomingLast = incoming[incoming.length - 1]?.id ?? null;
        const prevLast = prev[prev.length - 1]?.id ?? null;

        if (!prevLast) return incoming;

        if (
          incomingLast &&
          incomingLast === prevLast &&
          incoming.length === prev.length
        ) {
          return prev;
        }

        return incoming;
      });

      const newLastId = incoming[incoming.length - 1]?.id ?? null;
      if (newLastId && newLastId !== lastIdRef.current) {
        lastIdRef.current = newLastId;

        queueMicrotask(() => {
          const el = listRef.current;
          if (!el) return;

          const nearBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 160;
          if (nearBottom) el.scrollTop = el.scrollHeight;
        });
      }
    } catch (e: any) {
      if (String(e?.name) === "AbortError") return;
      setErr(String(e?.message || e || "Chat failed"));
    } finally {
      setLoading(false);
    }
  }

  // Desktop/panel fetch
  useEffect(() => {
    if (isComposer) return;

    setLoading(true);
    const ac = new AbortController();
    fetchMessages(ac.signal);

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isComposer]);

  // Realtime subscription (desktop/panel only)
  useEffect(() => {
    if (isComposer) return;
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
          if (!isAlive(msg)) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const next = [...prev, msg].filter(isAlive);
            return next.length > 200 ? next.slice(next.length - 200) : next;
          });

          queueMicrotask(() => {
            const el = listRef.current;
            if (!el) return;
            const nearBottom =
              el.scrollHeight - el.scrollTop - el.clientHeight < 160;
            if (nearBottom) el.scrollTop = el.scrollHeight;
          });
        }
      )
      .subscribe();

    const prune = setInterval(() => {
      setMessages((prev) => prev.filter(isAlive));
    }, 1000);

    return () => {
      clearInterval(prune);
      supabase.removeChannel(channel);
    };
  }, [roomId, isComposer]);

  async function sendMessage() {
    if (!canSend || posting) return;

    const msg = text.trim();
    setPosting(true);
    setErr(null);

    // composer mode doesn't need optimistic list items
    const optimisticId = `optimistic-${Date.now()}`;
    const nowIso = new Date().toISOString();

    if (!isComposer) {
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          room_id: roomId,
          user_id: null,
          user_email: userEmail,
          display_name: userEmail ? userEmail.split("@")[0] : "you",
          avatar_url: null,
          message: msg,
          created_at: nowIso,
        },
      ]);

      queueMicrotask(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }

    setText("");

    try {
      const res = await fetch("/api/live/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, message: msg }),
      });

      const json = (await res.json().catch(() => ({}))) as ApiPostResponse;

      if (!res.ok || "error" in json) {
        throw new Error(
          ("error" in json && json.error) || "Failed to send message"
        );
      }

      // If server returned the saved message, replace optimistic (desktop)
      if (!isComposer && "ok" in json && (json as any).message?.id) {
        const saved = (json as any).message as ChatMessage;
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== optimisticId);
          if (filtered.some((m) => m.id === saved.id)) return filtered;
          const next = [...filtered, saved].filter(isAlive);
          return next.length > 200 ? next.slice(next.length - 200) : next;
        });
      } else if (!isComposer) {
        await fetchMessages();
      }
    } catch (e: any) {
      setErr(String(e?.message || e || "Chat send failed"));
      if (!isComposer) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }
    } finally {
      setPosting(false);
    }
  }

  // ---------- COMPOSER ONLY (MOBILE) ----------
  if (isComposer) {
    return (
      <div className="w-full">
        {!userEmail ? (
          <a
            href={loginHref}
            className="inline-flex items-center justify-center w-full text-sm px-4 py-3 rounded-2xl border border-white/15 bg-black/35 backdrop-blur text-white/90"
          >
            Login to chat
          </a>
        ) : (
          <div className="flex items-center gap-2 w-full rounded-2xl border border-white/10 bg-black/35 backdrop-blur px-2.5 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Type a message…"
              className="flex-1 bg-transparent outline-none text-white/90 placeholder:text-white/35 px-2 py-2 text-sm"
              maxLength={280}
              inputMode="text"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!canSend || posting}
              className="shrink-0 rounded-2xl bg-emerald-400/90 hover:bg-emerald-300 text-black font-semibold px-4 py-2 text-sm disabled:opacity-50"
            >
              Send
            </button>
          </div>
        )}

        {err && (
          <div className="mt-2 text-[12px] text-red-200/90">{err}</div>
        )}
      </div>
    );
  }

  // ---------- PANEL / OVERLAY (DESKTOP) ----------
  return (
    <div
      data-live-chat="1"
      className={
        variant === "overlay"
          ? "w-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-3 flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.03)] max-h-[42vh]"
          : "h-[28vh] sm:h-[60vh] lg:h-[calc(100vh-140px)] rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-3 flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
      }
    >
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="text-sm font-semibold text-white/90">Live chat</div>
          <div className="text-[11px] text-white/45">
            Room{" "}
            <span className="font-mono text-white/65">
              {roomId.slice(0, 10)}…
            </span>
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

      <div className="mt-3 flex-1 min-h-0">
        <div
          ref={listRef}
          className="h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10"
        >
          {loading ? (
            <div className="text-sm text-white/50 px-1 py-2">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-white/45 px-1 py-2">
              No messages yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.filter(isAlive).map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-white/65 font-medium truncate">
                      {(m.display_name ||
                        m.user_email?.split("@")[0] ||
                        "someone") as string}
                    </div>
                    <div className="text-[11px] text-white/35">
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                  <div className="text-sm text-white/90 mt-1 break-words">
                    {m.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder={userEmail ? "Type a message…" : "Login to chat…"}
            disabled={!userEmail}
            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 placeholder:text-white/35 outline-none disabled:opacity-60"
            maxLength={280}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!canSend || posting}
            className="rounded-xl bg-emerald-400/90 hover:bg-emerald-300 text-black font-semibold px-4 py-2 text-sm disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <div className="mt-2 text-[11px] text-white/40">
          Messages disappear after 15 seconds.
        </div>

        {err && (
          <div className="mt-2 text-[12px] text-red-200/90">{err}</div>
        )}
      </div>
    </div>
  );
}

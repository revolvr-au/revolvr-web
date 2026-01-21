"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

type ApiPostResponse = { ok: true } | { error: string };

function initials(name: string) {
  const n = (name || '').trim();
  if (!n) return 'U';
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || 'U';
  const b = parts[1]?.[0] || '';
  return (a + b).toUpperCase();
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
}: {
  roomId: string;
  liveHrefForRedirect: string;
  userEmail: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [text, setText] = useState("");

  const listRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<string | null>(null);

  const canSend = !!userEmail && text.trim().length > 0 && text.trim().length <= 280;

  const loginHref = useMemo(() => {
    return `/login?redirectTo=${encodeURIComponent(liveHrefForRedirect)}`;
  }, [liveHrefForRedirect]);

  async function fetchMessages(signal?: AbortSignal) {
    try {
      setErr(null);

      const res = await fetch(
        `/api/live/chat?roomId=${encodeURIComponent(roomId)}&limit=80`,
        { method: "GET", signal, cache: "no-store" }
      );

      const json = (await res.json().catch(() => ({}))) as ApiGetResponse;

      if (!res.ok || "error" in json) {
        throw new Error(("error" in json && json.error) || "Failed to load chat");
      }

      const incoming = Array.isArray(json.messages) ? json.messages : [];

      setMessages((prev) => {
        const incomingLast = incoming[incoming.length - 1]?.id ?? null;
        const prevLast = prev[prev.length - 1]?.id ?? null;

        if (!prevLast) return incoming;

        if (incomingLast && incomingLast === prevLast && incoming.length === prev.length) {
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

          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
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

  useEffect(() => {
    setLoading(true);
    const ac = new AbortController();

    let inFlight = false;

    const tick = async () => {
      if (document.hidden) return;
      if (inFlight) return;
      inFlight = true;
      try {
        await fetchMessages(ac.signal);
      } finally {
        inFlight = false;
      }
    };

    tick();

    const t = window.setInterval(tick, 2500);

    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function sendMessage() {
    if (!canSend || posting) return;

    const msg = text.trim();
    setPosting(true);
    setErr(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const nowIso = new Date().toISOString();

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

    setText("");

    queueMicrotask(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });

    try {
      const res = await fetch("/api/live/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, message: msg }),
      });

      const json = (await res.json().catch(() => ({}))) as ApiPostResponse;

      if (!res.ok || "error" in json) {
        throw new Error(("error" in json && json.error) || "Failed to send message");
      }

      await fetchMessages();
    } catch (e: any) {
      setErr(String(e?.message || e || "Chat send failed"));
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="h-[72vh] lg:h-[calc(100vh-140px)] rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-3 flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="text-sm font-semibold text-white/90">Live chat</div>
          <div className="text-[11px] text-white/45">
            Room <span className="font-mono text-white/65">{roomId.slice(0, 10)}…</span>
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

      <div className="mt-3 h-px bg-white/10" />

      <div ref={listRef} className="flex-1 overflow-y-auto px-1 py-3 space-y-2">
        {loading ? <div className="text-xs text-white/50 px-1">Loading chat…</div> : null}

        {!loading && messages.length === 0 ? (
          <div className="px-1 py-6 text-center">
            <div className="text-sm font-semibold text-white/80">Be the first to say hi</div>
            <div className="mt-1 text-xs text-white/50">Messages appear here during the live stream.</div>
          </div>
        ) : null}

        {messages.map((m) => {
          const name =
            (m.display_name && m.display_name.trim()) ||
            (m.user_email ? m.user_email.split("@")[0] : "user");

          const isMe =
            !!userEmail &&
            !!m.user_email &&
            m.user_email.toLowerCase() === userEmail.toLowerCase();

          return (
            <div key={m.id} className={"flex " + (isMe ? "justify-end" : "justify-start")}>
              <div className={"flex max-w-[92%] gap-2 " + (isMe ? "flex-row-reverse" : "flex-row")}>
                <div
                  className={
                    "mt-0.5 h-7 w-7 shrink-0 rounded-full border flex items-center justify-center text-[10px] font-semibold " +
                    (isMe
                      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
                      : "border-white/10 bg-white/5 text-white/70")
                  }
                  title={name}
                >
                  {initials(name)}
                </div>

                <div
                  className={
                    "rounded-2xl border px-3 py-2 " +
                    (isMe
                      ? "border-emerald-400/30 bg-emerald-500/10"
                      : "border-white/10 bg-white/5")
                  }
                >
                  <div className={"flex items-center gap-2 " + (isMe ? "justify-end" : "justify-between")}>
                    <div className="text-[11px] text-white/65 truncate">
                      <span className="font-semibold text-white/85">{name}</span>
                    </div>
                    <div className="text-[10px] text-white/35 shrink-0">{formatTime(m.created_at)}</div>
                  </div>

                  <div className="mt-1 text-sm text-white/90 whitespace-pre-wrap break-words">
                    {m.message}
                  </div>
                </div>
              </div>
            </div>
          );
        })}      </div>

      {err ? (
        <div className="mb-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {err}
        </div>
      ) : null}

      <div className="mt-auto pt-2">
        {!userEmail ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/60">
            You must be logged in to chat.{" "}
            <a className="underline text-white/80" href={loginHref}>
              Login
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={text}
                maxLength={280}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message…"
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/25"
              />

              <button
                type="button"
                disabled={!canSend || posting}
                onClick={sendMessage}
                className="px-4 rounded-xl bg-emerald-400 text-black text-sm font-semibold hover:bg-emerald-300 disabled:opacity-50 disabled:hover:bg-emerald-400"
              >
                {posting ? "Sending…" : "Send"}
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="text-[11px] text-white/45">
                Press Enter to send • Shift+Enter for a new line
              </div>
              <div className={"text-[11px] " + (text.trim().length > 280 ? "text-red-300" : "text-white/45")}>
                {text.trim().length}/280
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

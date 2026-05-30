"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClients";
import MessageComposer from "./MessageComposer";

export type Msg = {
  id: string;
  conversationId: string;
  senderEmail: string;
  body: string;
  type: string;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
};

const BORDER = "rgba(255,255,255,0.08)";

/** Merge real (server) messages into the list, deduped by id, and drop any pending
 *  optimistic temp whose (sender, body) a real message now covers. Sorted by time. */
function mergeIncoming(prev: Msg[], incoming: Msg[]): Msg[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  let next = prev.slice();
  for (const msg of incoming) {
    if (byId.has(msg.id)) continue;
    next = next.filter(
      (m) => !(m.pending && m.senderEmail === msg.senderEmail && m.body === msg.body)
    );
    next.push(msg);
    byId.set(msg.id, msg);
  }
  next.sort((a, b) =>
    a.createdAt === b.createdAt
      ? a.id.localeCompare(b.id)
      : a.createdAt.localeCompare(b.createdAt)
  );
  return next;
}

export default function Thread({
  conversationId,
  meEmail,
  onRead,
  onActivity,
}: {
  conversationId: string;
  meEmail: string;
  onRead: () => void;
  onActivity: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tempSeq = useRef(0);
  const fetchingSince = useRef(false);
  // Newest createdAt we've seen — the reconnect/reconcile cursor.
  const lastCursorRef = useRef<string | null>(null);

  const setAndCursor = useCallback((updater: (prev: Msg[]) => Msg[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      const newest = next.filter((m) => !m.pending).at(-1);
      if (newest) lastCursorRef.current = newest.createdAt;
      return next;
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const markRead = useCallback(async () => {
    try {
      await fetch(`/api/messages/${conversationId}/read`, { method: "POST" });
      onRead();
    } catch {
      /* best-effort */
    }
  }, [conversationId, onRead]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const msgs: Msg[] = data.messages ?? [];
      setMessages(msgs);
      setHasMore(Boolean(data.hasMore));
      const newest = msgs.at(-1);
      if (newest) lastCursorRef.current = newest.createdAt;
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  }, [conversationId, scrollToBottom]);

  const loadOlder = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest || loadingMore) return;
    setLoadingMore(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const res = await fetch(
        `/api/messages/${conversationId}/messages?before=${encodeURIComponent(oldest.createdAt)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const older: Msg[] = data.messages ?? [];
      setMessages((prev) => mergeIncoming(prev, older));
      setHasMore(Boolean(data.hasMore));
      // Preserve scroll position after prepend.
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, messages, loadingMore]);

  // Reconcile by cursor — pull anything created after our newest known message.
  // Used on broadcast events and on (re)subscribe. Broadcast is best-effort, so this
  // fetch — not the socket payload — is the source of truth.
  const fetchSince = useCallback(async () => {
    if (fetchingSince.current) return;
    fetchingSince.current = true;
    try {
      const cursor = lastCursorRef.current;
      const url = cursor
        ? `/api/messages/${conversationId}/messages?after=${encodeURIComponent(cursor)}`
        : `/api/messages/${conversationId}/messages`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const fresh: Msg[] = data.messages ?? [];
      if (fresh.length === 0) return;
      setAndCursor((prev) => mergeIncoming(prev, fresh));
      const inbound = fresh.some((m) => m.senderEmail !== meEmail);
      if (inbound) {
        markRead();
        onActivity();
      }
      scrollToBottom();
    } finally {
      fetchingSince.current = false;
    }
  }, [conversationId, meEmail, markRead, onActivity, setAndCursor, scrollToBottom]);

  // Initial load + mark read.
  useEffect(() => {
    loadInitial().then(markRead);
  }, [loadInitial, markRead]);

  // Realtime subscription to the conversation's private channel.
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      const channel = supabase
        .channel(`conversation:${conversationId}`, { config: { private: true } })
        .on("broadcast", { event: "new_message" }, () => {
          // Best-effort signal → reconcile from the DB by cursor.
          fetchSince();
        })
        .subscribe((status) => {
          // On (re)connect, catch up on anything missed while disconnected.
          if (status === "SUBSCRIBED") fetchSince();
        });

      if (cancelled) {
        supabase.removeChannel(channel);
        return;
      }
      cleanup = () => supabase.removeChannel(channel);
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [conversationId, fetchSince]);

  const send = useCallback(
    async (text: string) => {
      const tempId = `temp-${tempSeq.current++}`;
      const optimistic: Msg = {
        id: tempId,
        conversationId,
        senderEmail: meEmail,
        body: text,
        type: "TEXT",
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      scrollToBottom();

      try {
        const res = await fetch(`/api/messages/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text }),
        });
        if (!res.ok) throw new Error("send_failed");
        const data = await res.json();
        const real: Msg = data.message;
        // Replace the temp with the real row (mergeIncoming drops the matching temp).
        setAndCursor((prev) => mergeIncoming(prev, [real]));
        onActivity();
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m))
        );
      }
    },
    [conversationId, meEmail, scrollToBottom, setAndCursor, onActivity]
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div ref={scrollRef} style={{ flex: "1 1 auto", overflowY: "auto", padding: "12px 14px" }}>
        {loading ? (
          <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 24 }}>
            Loading…
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={loadOlder}
                disabled={loadingMore}
                style={{
                  display: "block",
                  margin: "0 auto 12px",
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "6px 12px",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {loadingMore ? "Loading…" : "Load earlier messages"}
              </button>
            )}
            {messages.map((m) => (
              <Bubble key={m.id} msg={m} mine={m.senderEmail === meEmail} />
            ))}
          </>
        )}
      </div>
      <MessageComposer onSend={send} />
    </div>
  );
}

function Bubble({ msg, mine }: { msg: Msg; mine: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: mine ? "flex-end" : "flex-start",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: "72%",
          padding: "8px 12px",
          borderRadius: 16,
          background: mine ? "#F5C518" : "rgba(255,255,255,0.08)",
          color: mine ? "#0A0A0A" : "rgba(255,255,255,0.92)",
          fontSize: 14,
          lineHeight: 1.4,
          opacity: msg.pending ? 0.6 : 1,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          border: msg.failed ? "1px solid #ff6b6b" : "none",
        }}
      >
        {msg.body}
        {msg.failed && (
          <span style={{ display: "block", fontSize: 11, color: "#ff6b6b", marginTop: 2 }}>
            Failed to send
          </span>
        )}
      </div>
    </div>
  );
}

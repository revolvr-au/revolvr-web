"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InboxList, { type ConversationSummary } from "./InboxList";
import Thread from "./Thread";

const BG = "#050814";
const CARD = "#070b1b";
const BORDER = "rgba(255,255,255,0.08)";

export default function MessagesContent({ meEmail }: { meEmail: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => searchParams.get("c"),
  );
  const [isDesktop, setIsDesktop] = useState(false);

  // New-conversation composer state
  const [startEmail, setStartEmail] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Refresh the inbox when the tab regains focus (cheap, no push at launch).
  useEffect(() => {
    const onFocus = () => loadConversations();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadConversations]);

  // On selecting / reading a conversation, optimistically clear its unread badge.
  const markReadLocally = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      markReadLocally(id);
    },
    [markReadLocally]
  );

  const startConversation = useCallback(async () => {
    const target = startEmail.trim().toLowerCase();
    setStartError(null);
    if (!target || !target.includes("@")) {
      setStartError("Enter a valid email.");
      return;
    }
    if (target === meEmail) {
      setStartError("You can't message yourself.");
      return;
    }
    setStarting(true);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map: Record<string, string> = {
          DM_MINOR_BLOCKED: "DMs are unavailable for this account.",
          user_not_found: "No Revolvr user with that email.",
          cannot_dm_self: "You can't message yourself.",
          invalid_target: "Enter a valid email.",
        };
        setStartError(map[data?.error] ?? "Couldn't start the conversation.");
        return;
      }
      setStartEmail("");
      await loadConversations();
      handleSelect(data.conversationId);
    } finally {
      setStarting(false);
    }
  }, [startEmail, meEmail, loadConversations, handleSelect]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const showThread = isDesktop || selectedId !== null;
  const showList = isDesktop || selectedId === null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: BG,
        color: "rgba(255,255,255,0.92)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          flex: "0 0 auto",
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {!isDesktop && selectedId !== null ? (
          <button
            onClick={() => setSelectedId(null)}
            aria-label="Back to inbox"
            style={btnStyle}
          >
            ‹ Back
          </button>
        ) : (
          <button onClick={() => router.back()} aria-label="Close messages" style={btnStyle}>
            ‹
          </button>
        )}
        <span style={{ fontWeight: 700, letterSpacing: "0.04em" }}>
          {!isDesktop && selected ? labelFor(selected) : "Messages"}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: "1 1 auto", display: "flex", minHeight: 0 }}>
        {showList && (
          <div
            style={{
              width: isDesktop ? 340 : "100%",
              flex: isDesktop ? "0 0 340px" : "1 1 auto",
              borderRight: isDesktop ? `1px solid ${BORDER}` : "none",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {/* New conversation */}
            <div style={{ padding: 12, borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={startEmail}
                  onChange={(e) => setStartEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startConversation()}
                  placeholder="Start a message (email)"
                  inputMode="email"
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "inherit",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <button
                  onClick={startConversation}
                  disabled={starting}
                  style={{ ...btnStyle, opacity: starting ? 0.6 : 1 }}
                >
                  {starting ? "…" : "New"}
                </button>
              </div>
              {startError && (
                <div style={{ color: "#ff6b6b", fontSize: 12, marginTop: 8 }}>{startError}</div>
              )}
            </div>

            <InboxList
              conversations={conversations}
              loading={loading}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>
        )}

        {showThread && (
          <div style={{ flex: "1 1 auto", display: "flex", minHeight: 0 }}>
            {selectedId ? (
              <Thread
                key={selectedId}
                conversationId={selectedId}
                meEmail={meEmail}
                onRead={() => markReadLocally(selectedId)}
                onActivity={loadConversations}
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 14,
                }}
              >
                Select a conversation
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function labelFor(c: ConversationSummary): string {
  return c.other?.displayName || c.other?.email || "Conversation";
}

const btnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: "8px 12px",
  color: "inherit",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

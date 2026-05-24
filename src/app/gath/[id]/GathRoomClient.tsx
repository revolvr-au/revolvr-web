"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const GOLD = "#F5C518";

type GathRole = "IGNITER" | "HOST" | "MEMBER";
type GathType = "OPEN" | "PRIVATE" | "BUSINESS";
type GathStatus = "PRELAUNCHING" | "ACTIVE" | "ARCHIVED";

type Member = {
  id: string;
  gathId: string;
  userEmail: string;
  role: GathRole;
  joinedAt: string;
};

type Message = {
  id: string;
  gathId: string;
  userEmail: string;
  content: string;
  voltage: number;
  createdAt: string;
};

type SeededPost = {
  id: string;
  caption: string;
  imageUrl: string;
  media_url: string | null;
  userEmail: string;
};

type GathDetail = {
  id: string;
  name: string;
  description: string | null;
  type: GathType;
  status: GathStatus;
  creatorEmail: string;
  sparkCost: number;
  launchDate: string | null;
  createdAt: string;
  memberCount: number;
  members: Member[];
  messages: Message[];
  seededPosts: SeededPost[];
};

function SparkIcon({ size = 12, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
    </svg>
  );
}

function handleFromEmail(email: string) {
  return email.split("@")[0] ?? email;
}

function initialFromEmail(email: string) {
  return (email[0] ?? "?").toUpperCase();
}

function MemberAvatar({
  email,
  size = 30,
  role,
}: {
  email: string;
  size?: number;
  role?: GathRole;
}) {
  const isIgniter = role === "IGNITER";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1a2030, #0a0e18)",
          border: isIgniter ? `1.5px solid ${GOLD}` : "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.8)",
          fontFamily: "monospace",
          fontSize: Math.max(10, size * 0.4),
          fontWeight: 700,
          boxShadow: isIgniter ? "0 0 8px rgba(245,197,24,0.45)" : "none",
        }}
      >
        {initialFromEmail(email)}
      </div>
      {isIgniter && (
        <div
          aria-label="IGNITER"
          title="IGNITER"
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "rgba(8,12,20,0.95)",
            border: `1px solid ${GOLD}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SparkIcon size={8} color={GOLD} />
        </div>
      )}
    </div>
  );
}

export default function GathRoomClient({ id }: { id: string }) {
  const router = useRouter();
  const [gath, setGath] = useState<GathDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadGath = useCallback(async () => {
    try {
      const res = await fetch(`/api/gath/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "failed");
      } else {
        setGath(data.gath);
      }
    } catch (e: any) {
      setError(e?.message ?? "failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    loadGath();
  }, [loadGath]);

  // Realtime subscription to GathMessage rows for this gathId
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`gath:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "GathMessage",
          filter: `gathId=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row?.id) return;
          setGath((prev) => {
            if (!prev) return prev;
            if (prev.messages.some((m) => m.id === row.id)) return prev;
            return {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: row.id,
                  gathId: row.gathId,
                  userEmail: row.userEmail,
                  content: row.content,
                  voltage: row.voltage ?? 0,
                  createdAt: row.createdAt,
                },
              ],
            };
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [gath?.messages.length]);

  const isMember =
    !!userEmail &&
    !!gath?.members.some((m) => m.userEmail === userEmail);

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || !userEmail || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/gath/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gathId: id, userEmail, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setDraft("");
        // Optimistic append (realtime will dedupe by id)
        setGath((prev) =>
          prev
            ? { ...prev, messages: [...prev.messages, data.message] }
            : prev,
        );
      }
    } finally {
      setSending(false);
    }
  }, [draft, userEmail, sending, id]);

  const handleJoin = useCallback(async () => {
    if (!userEmail || joining) return;
    setJoining(true);
    try {
      const res = await fetch("/api/gath/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gathId: id, userEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        await loadGath();
      }
    } finally {
      setJoining(false);
    }
  }, [userEmail, joining, id, loadGath]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#050814",
          color: "rgba(255,255,255,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          fontSize: 11,
          letterSpacing: "0.24em",
        }}
      >
        LOADING GATH…
      </div>
    );
  }

  if (error || !gath) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#050814",
          color: "rgba(255,255,255,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          fontFamily: "monospace",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: "0.24em", color: GOLD }}>
          GATH NOT FOUND
        </div>
        <button
          onClick={() => router.push("/public-feed")}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 10,
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.22em",
            cursor: "pointer",
          }}
        >
          BACK TO FEED
        </button>
      </div>
    );
  }

  const seededPost = gath.seededPosts[0];
  const visibleMembers = gath.members.slice(0, 5);
  const igniter = gath.members.find((m) => m.role === "IGNITER");

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#050814",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
        fontFamily: "monospace",
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 14px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(7,11,27,0.95)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <button
            onClick={() => router.back()}
            aria-label="Back"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {gath.name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 4,
                fontSize: 9,
                letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              <span
                style={{
                  padding: "2px 6px",
                  border: `1px solid ${gath.type === "BUSINESS" ? GOLD : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 4,
                  color: gath.type === "BUSINESS" ? GOLD : "rgba(255,255,255,0.7)",
                }}
              >
                {gath.type}
              </span>
              <span>{gath.memberCount} MEMBERS</span>
              {gath.status === "PRELAUNCHING" && (
                <span style={{ color: GOLD }}>PRE-LAUNCH</span>
              )}
            </div>
          </div>
        </div>

        {/* IGNITER chip */}
        {igniter && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 8px",
              border: `1px solid ${GOLD}`,
              borderRadius: 999,
              background: "rgba(245,197,24,0.06)",
              fontSize: 8,
              letterSpacing: "0.22em",
              color: GOLD,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            <SparkIcon size={9} color={GOLD} />
            IGNITER · @{handleFromEmail(igniter.userEmail)}
          </div>
        )}

        {/* Seeded post */}
        {seededPost && (
          <div
            onClick={() => router.push(`/post/${seededPost.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 8,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              marginBottom: 10,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: seededPost.imageUrl
                  ? `url(${seededPost.imageUrl}) center/cover`
                  : "linear-gradient(135deg, #1a2030, #0a0e18)",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 8,
                  letterSpacing: "0.22em",
                  color: GOLD,
                  fontWeight: 700,
                  marginBottom: 2,
                }}
              >
                SEEDED POST
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.7)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {seededPost.caption || "—"}
              </div>
            </div>
          </div>
        )}

        {/* Members row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {visibleMembers.map((m) => (
            <MemberAvatar key={m.id} email={m.userEmail} role={m.role} />
          ))}
          {gath.memberCount > visibleMembers.length && (
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.18em",
                marginLeft: 4,
              }}
            >
              +{gath.memberCount - visibleMembers.length}
            </div>
          )}
        </div>
      </div>

      {/* Chat scroll area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {gath.messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.3)",
              fontSize: 10,
              letterSpacing: "0.22em",
            }}
          >
            NO MESSAGES YET
          </div>
        ) : (
          gath.messages.map((m) => {
            const isIgniter =
              gath.members.find((mem) => mem.userEmail === m.userEmail)?.role ===
              "IGNITER";
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <MemberAvatar
                  email={m.userEmail}
                  size={28}
                  role={isIgniter ? "IGNITER" : undefined}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#fff",
                        letterSpacing: "0.04em",
                      }}
                    >
                      @{handleFromEmail(m.userEmail)}
                    </span>
                    {isIgniter && (
                      <span title="IGNITER" style={{ display: "inline-flex" }}>
                        <SparkIcon size={9} color={GOLD} />
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 8,
                        color: "rgba(255,255,255,0.35)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      lineHeight: 1.55,
                      color: "rgba(255,255,255,0.88)",
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
                      wordBreak: "break-word",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 12px)",
          background: "rgba(7,11,27,0.95)",
        }}
      >
        {!userEmail ? (
          <div
            style={{
              textAlign: "center",
              padding: 10,
              fontSize: 10,
              letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            SIGN IN TO CHAT
          </div>
        ) : !isMember ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              background: GOLD,
              color: "#0a0e16",
              border: "none",
              fontFamily: "monospace",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: "0.28em",
              cursor: joining ? "wait" : "pointer",
            }}
          >
            {joining ? "JOINING…" : "JOIN GATH"}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Say something…"
              style={{
                flex: 1,
                resize: "none",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "10px 12px",
                color: "#fff",
                fontFamily: "monospace",
                fontSize: 12,
                outline: "none",
                maxHeight: 100,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              aria-label="Send"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: draft.trim() ? GOLD : "rgba(245,197,24,0.25)",
                border: "none",
                color: "#0a0e16",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: draft.trim() && !sending ? "pointer" : "not-allowed",
                flexShrink: 0,
                boxShadow: draft.trim()
                  ? "0 4px 16px rgba(245,197,24,0.3)"
                  : "none",
              }}
            >
              <Send size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

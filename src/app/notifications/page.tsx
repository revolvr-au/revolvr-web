"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FeedLayout from "@/components/FeedLayout";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import type { TrancheNotificationType } from "@prisma/client";

const GOLD = "#F5C518";
const AMBER = "#FBBF24";

type NotificationRow = {
  id: string;
  type: TrancheNotificationType;
  copy: string;
  isRead: boolean;
  sentAt: string;
  trancheEventId: string;
  commentId: string | null;
  postId: string | null;
  gathId: string | null;
  metadata: unknown;
};

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data }) => {
      setViewerEmail(data.user?.email ?? null);
      setAuthResolved(true);
    });
  }, []);

  const load = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications?viewerEmail=${encodeURIComponent(email)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (data?.ok) {
        const filtered: NotificationRow[] = (data.notifications ?? []).filter(
          (n: NotificationRow) => Boolean(n.copy),
        );
        setItems(filtered);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!viewerEmail) return;
    load(viewerEmail);
  }, [viewerEmail, load]);

  // Mark all unread as read after the user views the page
  useEffect(() => {
    if (!viewerEmail || items.length === 0) return;
    const unreadIds = items.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewerEmail, ids: unreadIds }),
    }).catch(() => {});
  }, [viewerEmail, items]);

  const onTap = (n: NotificationRow) => {
    if (n.gathId) {
      router.push(`/gath/${n.gathId}`);
    } else if (n.postId) {
      router.push(`/p/${n.postId}`);
    } else {
      router.push("/tranche");
    }
  };

  return (
    <FeedLayout>
      <div
        style={{
          height: "100dvh",
          overflowY: "auto",
          paddingTop: 72,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          paddingLeft: 16,
          paddingRight: 16,
          scrollbarWidth: "none",
        }}
      >
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 48,
            letterSpacing: 3,
            color: "white",
            margin: "0 0 4px",
            lineHeight: 1,
          }}
        >
          NOTIFICATIONS
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.45)",
            margin: "0 0 22px",
          }}
        >
          TRANCHE moments and signals.
        </p>

        {!authResolved || loading ? (
          <div
            style={{
              fontFamily: "'Space Grotesk', monospace",
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.3)",
              textAlign: "center",
              padding: 40,
            }}
          >
            LOADING…
          </div>
        ) : !viewerEmail ? (
          <EmptyState title="SIGN IN REQUIRED" hint="Notifications need your account." />
        ) : items.length === 0 ? (
          <EmptyState
            title="NO NOTIFICATIONS"
            hint="When your comments break out or you witness a TRANCHE moment early, it shows up here."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => onTap(n)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  width: "100%",
                  padding: "14px 14px",
                  background: n.isRead
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(245,197,24,0.06)",
                  border: `1px solid ${n.isRead ? "rgba(255,255,255,0.06)" : "rgba(245,197,24,0.25)"}`,
                  borderRadius: 12,
                  color: "white",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                {!n.isRead && (
                  <span
                    aria-hidden
                    style={{
                      marginTop: 6,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: AMBER,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${AMBER}`,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "rgba(255,255,255,0.92)",
                      marginBottom: 6,
                    }}
                  >
                    {n.copy}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', monospace",
                      fontSize: 10,
                      letterSpacing: "0.16em",
                      color: n.isRead ? "rgba(255,255,255,0.3)" : GOLD,
                    }}
                  >
                    {n.type.replace(/_/g, " ")} · {formatAge(n.sentAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </FeedLayout>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        paddingTop: 64,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28,
          letterSpacing: 3,
          color: "rgba(255,255,255,0.18)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
          maxWidth: 320,
        }}
      >
        {hint}
      </div>
    </div>
  );
}

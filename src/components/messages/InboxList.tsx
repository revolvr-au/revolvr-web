"use client";

export type ConversationSummary = {
  id: string;
  lastMessageAt: string;
  muted: boolean;
  other: { email: string; displayName: string | null; avatarUrl: string | null } | null;
  lastMessage: { body: string; senderEmail: string; createdAt: string } | null;
  unreadCount: number;
};

const BORDER = "rgba(255,255,255,0.06)";

export default function InboxList({
  conversations,
  loading,
  selectedId,
  onSelect,
}: {
  conversations: ConversationSummary[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return <div style={emptyStyle}>Loading…</div>;
  }
  if (conversations.length === 0) {
    return <div style={emptyStyle}>No conversations yet. Start one above.</div>;
  }

  return (
    <div style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}>
      {conversations.map((c) => {
        const name = c.other?.displayName || c.other?.email || "Conversation";
        const preview = c.lastMessage?.body ?? "No messages yet";
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              width: "100%",
              textAlign: "left",
              background: active ? "rgba(255,255,255,0.06)" : "transparent",
              border: "none",
              borderBottom: `1px solid ${BORDER}`,
              padding: "12px 14px",
              color: "inherit",
              cursor: "pointer",
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <Avatar name={name} url={c.other?.avatarUrl ?? null} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span
                  style={{
                    fontWeight: c.unreadCount > 0 ? 700 : 600,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {name}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", flexShrink: 0 }}>
                  {timeAgo(c.lastMessageAt)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: c.unreadCount > 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: 2,
                }}
              >
                {preview}
              </div>
            </div>
            {c.unreadCount > 0 && (
              <span
                style={{
                  flexShrink: 0,
                  minWidth: 20,
                  height: 20,
                  padding: "0 6px",
                  borderRadius: 10,
                  background: "#F5C518",
                  color: "#0A0A0A",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {c.unreadCount > 99 ? "99+" : c.unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={40}
        height={40}
        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <span
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.1)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

const emptyStyle: React.CSSProperties = {
  flex: "1 1 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  textAlign: "center",
  color: "rgba(255,255,255,0.6)",
  fontSize: 14,
};

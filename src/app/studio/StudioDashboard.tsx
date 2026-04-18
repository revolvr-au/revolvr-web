"use client";

import { useEffect, useState, useCallback } from "react";
import type { CSSProperties } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pulse {
  users: number;
  creators: number;
  posts: number;
  follows: number;
  recentPosts: number;
  recentEvents: number;
}

interface TopPost {
  postId: string | null;
  creatorEmail: string;
  totalPoints: number;
}

interface UserRow {
  email: string;
  displayName: string | null;
  isCreator: boolean;
  status: string;
}

interface Config {
  voltageWeight: number;
  interactionWeight: number;
  clusterWeight: number;
  momentumWeight: number;
  momentumEnabled: boolean;
  clusteringEnabled: boolean;
  feedPaused: boolean;
}

interface AuditEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}

interface MessageModal {
  userEmail: string;
  subject: string;
  body: string;
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

const CYAN = "#00e5ff";
const BG = "#050814";

const card: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
};

const cyanCard: CSSProperties = {
  ...card,
  border: "1px solid rgba(0,229,255,0.15)",
};

const sectionTitle: CSSProperties = {
  fontFamily: '"Bebas Neue", cursive',
  fontSize: 22,
  letterSpacing: "0.06em",
  color: CYAN,
  marginBottom: 16,
};

const inputStyle: CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "8px 14px",
  color: "#fff",
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.3)",
  paddingBottom: 10,
  fontWeight: 600,
  paddingRight: 16,
};

function btnStyle(variant: string): CSSProperties {
  const base: CSSProperties = {
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  };
  if (variant === "danger")
    return { ...base, background: "rgba(239,68,68,0.2)", color: "#ef4444" };
  if (variant === "warn")
    return { ...base, background: "rgba(251,191,36,0.2)", color: "#fbbf24" };
  if (variant === "ghost")
    return {
      ...base,
      background: "transparent",
      color: "rgba(255,255,255,0.5)",
      border: "1px solid rgba(255,255,255,0.15)",
    };
  if (variant === "cyan")
    return {
      ...base,
      background: "rgba(0,229,255,0.15)",
      color: CYAN,
      border: `1px solid rgba(0,229,255,0.3)`,
    };
  return { ...base, background: "rgba(255,255,255,0.12)", color: "#fff" };
}

const DEFAULT_CONFIG: Config = {
  voltageWeight: 1.0,
  interactionWeight: 7.0,
  clusterWeight: 4.0,
  momentumWeight: 5.0,
  momentumEnabled: true,
  clusteringEnabled: true,
  feedPaused: false,
};

function statusColor(status: string): string {
  if (status === "banned") return "#ef4444";
  if (status === "paused") return "#fbbf24";
  return "#22c55e";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearanceBadge(role: string): { label: string; color: string; bg: string } {
  if (role === "MODERATOR") return { label: "MODERATOR", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" };
  if (role === "SUPPORT") return { label: "SUPPORT", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.08)" };
  return { label: "ADMIN", color: CYAN, bg: "rgba(0,229,255,0.12)" };
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudioDashboard({
  email,
  studioRole = "ADMIN",
  lockCountdown = null,
}: {
  email: string;
  studioRole?: string;
  lockCountdown?: number | null;
}) {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [topPosts, setTopPosts] = useState<TopPost[] | null>(null);

  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [actionMsgs, setActionMsgs] = useState<Record<string, string>>({});

  const [configDraft, setConfigDraft] = useState<Config>(DEFAULT_CONFIG);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState("");

  const [broadcastForm, setBroadcastForm] = useState({
    subject: "",
    body: "",
    targetType: "all",
  });
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");

  const [auditLogs, setAuditLogs] = useState<AuditEntry[] | null>(null);
  const [modal, setModal] = useState<MessageModal | null>(null);
  const [modalSending, setModalSending] = useState(false);
  const [modalMsg, setModalMsg] = useState("");

  // ─── Data loaders ───────────────────────────────────────────────────────────

  const loadPulse = useCallback(async () => {
    const res = await fetch("/api/studio/pulse");
    if (res.ok) setPulse(await res.json());
  }, []);

  const loadTopPosts = useCallback(async () => {
    const res = await fetch("/api/studio/top-posts");
    if (res.ok) setTopPosts((await res.json()).topPosts);
  }, []);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/studio/config");
    if (res.ok) {
      const { config } = await res.json();
      setConfigDraft(config);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    const res = await fetch("/api/studio/audit");
    if (res.ok) setAuditLogs((await res.json()).logs);
  }, []);

  useEffect(() => {
    loadPulse();
    loadTopPosts();
    loadConfig();
    loadAudit();
  }, [loadPulse, loadTopPosts, loadConfig, loadAudit]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const searchUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await fetch(
      `/api/studio/users?q=${encodeURIComponent(userQuery)}`
    );
    if (res.ok) setUsers((await res.json()).users);
    setUsersLoading(false);
  }, [userQuery]);

  const handleUserAction = async (targetEmail: string, action: string) => {
    const res = await fetch("/api/studio/users/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetEmail, action }),
    });
    setActionMsgs((prev) => ({ ...prev, [targetEmail]: res.ok ? "Done" : "Error" }));
    if (res.ok) {
      searchUsers();
      loadAudit();
    }
  };

  const handleConfigSave = async () => {
    setConfigSaving(true);
    setConfigMsg("");
    const res = await fetch("/api/studio/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configDraft),
    });
    if (res.ok) {
      const { config } = await res.json();
      setConfigDraft(config);
      setConfigMsg("Saved");
      loadAudit();
    } else {
      setConfigMsg("Error saving");
    }
    setConfigSaving(false);
  };

  const handleBroadcast = async () => {
    if (!broadcastForm.subject.trim() || !broadcastForm.body.trim()) return;
    setBroadcastSending(true);
    setBroadcastMsg("");
    const res = await fetch("/api/studio/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(broadcastForm),
    });
    if (res.ok) {
      setBroadcastMsg("Sent");
      setBroadcastForm({ subject: "", body: "", targetType: "all" });
      loadAudit();
    } else {
      setBroadcastMsg("Error");
    }
    setBroadcastSending(false);
  };

  const handleModalSend = async () => {
    if (!modal?.subject.trim() || !modal.body.trim()) return;
    setModalSending(true);
    setModalMsg("");
    const res = await fetch("/api/studio/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: modal.subject,
        body: modal.body,
        targetType: "user",
        targetValue: modal.userEmail,
      }),
    });
    if (res.ok) {
      setModalMsg("Sent");
      loadAudit();
      setTimeout(() => setModal(null), 1000);
    } else {
      setModalMsg("Error");
    }
    setModalSending(false);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        color: "#fff",
        padding: "28px 24px 60px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 36,
          borderBottom: "1px solid rgba(0,229,255,0.15)",
          paddingBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: '"Bebas Neue", cursive',
              fontSize: 42,
              letterSpacing: "0.1em",
              color: "#ffffff",
              lineHeight: 1,
            }}
          >
            REVOLVR STUDIO
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.12em", fontFamily: "monospace" }}>
            COMMAND &amp; CONTROL
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {lockCountdown !== null && (
            <div style={{ fontSize: 11, color: "#fbbf24", letterSpacing: "0.06em", fontFamily: "monospace" }}>
              Session locks in {formatCountdown(lockCountdown)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,229,255,0.12)",
              border: "1px solid rgba(0,229,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: '"Bebas Neue", cursive',
              fontSize: 18, color: CYAN,
            }}>
              {email[0].toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {email}
            </div>
            {(() => {
              const badge = clearanceBadge(studioRole);
              return (
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                  padding: "2px 8px", borderRadius: 4,
                  color: badge.color, background: badge.bg,
                }}>
                  {badge.label}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Section 1: Platform Pulse ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionTitle}>Platform Pulse</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          {[
            { label: "Total Users", value: pulse?.users },
            { label: "Total Creators", value: pulse?.creators },
            { label: "Total Posts", value: pulse?.posts },
            { label: "Total Follows", value: pulse?.follows },
            { label: "Posts (24h)", value: pulse?.recentPosts, highlight: true },
            { label: "Events (24h)", value: pulse?.recentEvents, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{ ...cyanCard, textAlign: "center", padding: "18px 12px" }}>
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 10,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: 40,
                  letterSpacing: "0.02em",
                  color: highlight ? CYAN : "#fff",
                  lineHeight: 1,
                  textShadow: highlight ? `0 0 20px rgba(0,229,255,0.4)` : "none",
                }}
              >
                {value ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sections 2 + 4: Two columns ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 20,
          marginBottom: 28,
        }}
      >
        {/* Section 2: Top Posts */}
        <div style={card}>
          <div style={sectionTitle}>Top Posts by Voltage</div>
          {topPosts === null ? (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div>
          ) : topPosts.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              No voltage events yet
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Post ID</th>
                  <th style={thStyle}>Creator</th>
                  <th style={thStyle}>Points</th>
                </tr>
              </thead>
              <tbody>
                {topPosts.map((p, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "10px 0", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                      {i + 1}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "rgba(255,255,255,0.6)",
                        maxWidth: 100,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.postId ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.7)",
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.creatorEmail}
                    </td>
                    <td
                      style={{
                        padding: "10px 0",
                        fontFamily: '"Bebas Neue", cursive',
                        fontSize: 20,
                        color: CYAN,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {p.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 4: Feed Controls */}
        <div style={card}>
          <div style={sectionTitle}>Feed Controls</div>

          {/* Sliders */}
          {(
            [
              { key: "voltageWeight" as keyof Config, label: "Voltage Weight", min: 0.1, max: 5, step: 0.1 },
              { key: "interactionWeight" as keyof Config, label: "Interaction Weight", min: 1, max: 15, step: 0.5 },
              { key: "clusterWeight" as keyof Config, label: "Cluster Weight", min: 1, max: 10, step: 0.5 },
              { key: "momentumWeight" as keyof Config, label: "Momentum Weight", min: 1, max: 10, step: 0.5 },
            ]
          ).map(({ key, label, min, max, step }) => (
            <div key={key} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{label}</span>
                <span
                  style={{
                    fontFamily: '"Bebas Neue", cursive',
                    fontSize: 16,
                    color: CYAN,
                    letterSpacing: "0.04em",
                    minWidth: 32,
                    textAlign: "right",
                  }}
                >
                  {(configDraft[key] as number).toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={configDraft[key] as number}
                onChange={(e) =>
                  setConfigDraft((prev) => ({
                    ...prev,
                    [key]: parseFloat(e.target.value),
                  }))
                }
                style={{ width: "100%", accentColor: CYAN, cursor: "pointer" }}
              />
            </div>
          ))}

          {/* Toggles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {(
              [
                { key: "momentumEnabled" as keyof Config, label: "Momentum Enabled", danger: false },
                { key: "clusteringEnabled" as keyof Config, label: "Clustering Enabled", danger: false },
                { key: "feedPaused" as keyof Config, label: "Feed Paused", danger: true },
              ]
            ).map(({ key, label, danger }) => {
              const on = configDraft[key] as boolean;
              return (
                <div
                  key={key}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color:
                        danger && on ? "#ef4444" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {label}
                  </span>
                  <button
                    onClick={() =>
                      setConfigDraft((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      border: "none",
                      cursor: "pointer",
                      background: on
                        ? danger
                          ? "#ef4444"
                          : CYAN
                        : "rgba(255,255,255,0.15)",
                      position: "relative",
                      flexShrink: 0,
                      transition: "background 0.2s",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        left: on ? 23 : 3,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#fff",
                        transition: "left 0.2s",
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleConfigSave}
              disabled={configSaving}
              style={btnStyle("cyan")}
            >
              {configSaving ? "Saving…" : "Save Config"}
            </button>
            {configMsg && (
              <span
                style={{
                  fontSize: 12,
                  color: configMsg === "Saved" ? CYAN : "#ef4444",
                }}
              >
                {configMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 3: User Management ── */}
      <div style={{ ...card, marginBottom: 28 }}>
        <div style={sectionTitle}>User Management</div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
            placeholder="Search by email…"
            style={{ ...inputStyle, flex: 1, width: "auto" }}
          />
          <button
            onClick={searchUsers}
            disabled={usersLoading}
            style={btnStyle("cyan")}
          >
            {usersLoading ? "…" : "Search"}
          </button>
        </div>

        {users === null ? (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            Enter an email to search
          </div>
        ) : users.length === 0 ? (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No users found</div>
        ) : (
          <div>
            {users.map((u) => (
              <div
                key={u.email}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>
                      {u.displayName || u.email}
                    </span>
                    {u.isCreator && (
                      <span
                        style={{
                          fontSize: 9,
                          background: "rgba(0,229,255,0.12)",
                          color: CYAN,
                          borderRadius: 4,
                          padding: "2px 6px",
                          letterSpacing: "0.08em",
                          fontWeight: 700,
                        }}
                      >
                        CREATOR
                      </span>
                    )}
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: statusColor(u.status),
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      {u.status}
                    </span>
                  </div>
                  {u.displayName && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>
                      {u.email}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  {actionMsgs[u.email] && (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      {actionMsgs[u.email]}
                    </span>
                  )}
                  <button onClick={() => handleUserAction(u.email, "pause")} style={btnStyle("warn")}>
                    Pause
                  </button>
                  <button onClick={() => handleUserAction(u.email, "ban")} style={btnStyle("danger")}>
                    Ban
                  </button>
                  <button
                    onClick={() => setModal({ userEmail: u.email, subject: "", body: "" })}
                    style={btnStyle("ghost")}
                  >
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 5: Broadcast ── */}
      <div style={{ ...card, marginBottom: 28 }}>
        <div style={sectionTitle}>Broadcast</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={broadcastForm.subject}
              onChange={(e) =>
                setBroadcastForm((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="Subject"
              style={{ ...inputStyle, flex: 1, width: "auto" }}
            />
            <select
              value={broadcastForm.targetType}
              onChange={(e) =>
                setBroadcastForm((prev) => ({ ...prev, targetType: e.target.value }))
              }
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "8px 14px",
                color: "#fff",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All users</option>
              <option value="creators">Creators only</option>
            </select>
          </div>
          <textarea
            value={broadcastForm.body}
            onChange={(e) =>
              setBroadcastForm((prev) => ({ ...prev, body: e.target.value }))
            }
            placeholder="Message body…"
            rows={4}
            style={{
              ...inputStyle,
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleBroadcast}
              disabled={broadcastSending}
              style={btnStyle("cyan")}
            >
              {broadcastSending ? "Sending…" : "Send Broadcast"}
            </button>
            {broadcastMsg && (
              <span
                style={{
                  fontSize: 12,
                  color: broadcastMsg === "Sent" ? CYAN : "#ef4444",
                }}
              >
                {broadcastMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 6: Audit Log ── */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ ...sectionTitle, marginBottom: 0 }}>Audit Log</div>
          <button onClick={loadAudit} style={btnStyle("ghost")}>
            Refresh
          </button>
        </div>

        {auditLogs === null ? (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Loading…</div>
        ) : auditLogs.length === 0 ? (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            No audit entries yet
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Actor</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Target</th>
                  <th style={thStyle}>When</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <td
                      style={{
                        padding: "9px 16px 9px 0",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.65)",
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.actorEmail}
                    </td>
                    <td
                      style={{
                        padding: "9px 16px 9px 0",
                        fontSize: 12,
                        color: CYAN,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.action}
                    </td>
                    <td
                      style={{
                        padding: "9px 16px 9px 0",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      {log.targetType ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "9px 16px 9px 0",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.65)",
                        maxWidth: 160,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.targetId ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "9px 0",
                        fontSize: 11,
                        color: "rgba(255,255,255,0.3)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Message Modal ── */}
      {modal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{
              ...card,
              width: "100%",
              maxWidth: 440,
              margin: "0 20px",
              border: "1px solid rgba(0,229,255,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontFamily: '"Bebas Neue", cursive',
                fontSize: 22,
                color: CYAN,
                marginBottom: 4,
              }}
            >
              Message User
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
              {modal.userEmail}
            </div>
            <input
              value={modal.subject}
              onChange={(e) =>
                setModal((prev) => prev && { ...prev, subject: e.target.value })
              }
              placeholder="Subject"
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <textarea
              value={modal.body}
              onChange={(e) =>
                setModal((prev) => prev && { ...prev, body: e.target.value })
              }
              placeholder="Message…"
              rows={5}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={handleModalSend}
                disabled={modalSending}
                style={btnStyle("cyan")}
              >
                {modalSending ? "Sending…" : "Send"}
              </button>
              <button onClick={() => setModal(null)} style={btnStyle("ghost")}>
                Cancel
              </button>
              {modalMsg && (
                <span
                  style={{
                    fontSize: 12,
                    color: modalMsg === "Sent" ? CYAN : "#ef4444",
                  }}
                >
                  {modalMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

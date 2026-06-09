"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

const CYAN = "#ffffff";
const BG = "#050814";

const card: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
};

const sectionTitle: CSSProperties = {
  fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
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

function btnStyle(variant: "cyan" | "danger" | "ghost"): CSSProperties {
  const base: CSSProperties = {
    border: "none",
    borderRadius: 6,
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
  };
  if (variant === "danger")
    return { ...base, background: "rgba(239,68,68,0.18)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.32)" };
  if (variant === "ghost")
    return {
      ...base,
      background: "transparent",
      color: "rgba(255,255,255,0.6)",
      border: "1px solid rgba(255,255,255,0.15)",
    };
  return {
    ...base,
    background: "rgba(255,255,255,0.15)",
    color: CYAN,
    border: `1px solid rgba(255,255,255,0.3)`,
  };
}

const chip: CSSProperties = {
  display: "inline-block",
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 10,
  letterSpacing: "0.06em",
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(255,255,255,0.18)",
  marginRight: 6,
  marginBottom: 4,
  fontFamily: "monospace",
};

type Application = {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  languages: string[];
  domains: string[];
  motivation: string;
  appliedAt: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function StudioTfcPage() {
  const router = useRouter();
  const [reviewerEmail, setReviewerEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [rejectingEmail, setRejectingEmail] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionMsgs, setActionMsgs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // ── Auth: only proceed if /api/studio/me returns ok ─────────────────────
  useEffect(() => {
    fetch("/api/studio/me")
      .then((res) => {
        if (!res.ok) {
          router.replace("/studio");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.email) setReviewerEmail(data.email);
        setAuthChecked(true);
      })
      .catch(() => router.replace("/studio"));
  }, [router]);

  const load = useCallback(async (email: string) => {
    const res = await fetch(
      `/api/tfc/applications?reviewerEmail=${encodeURIComponent(email)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      setApplications([]);
      return;
    }
    const data = await res.json();
    setApplications(data.ok ? data.applications : []);
  }, []);

  useEffect(() => {
    if (reviewerEmail) load(reviewerEmail);
  }, [reviewerEmail, load]);

  const approve = async (applicantEmail: string) => {
    if (!reviewerEmail) return;
    setBusy((b) => ({ ...b, [applicantEmail]: true }));
    setApplications((prev) => prev?.filter((a) => a.email !== applicantEmail) ?? prev);
    setActionMsgs((m) => ({ ...m, [applicantEmail]: "Approving…" }));
    const res = await fetch("/api/tfc/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantEmail, reviewerEmail }),
    });
    if (!res.ok) {
      setActionMsgs((m) => ({ ...m, [applicantEmail]: "Failed — refreshing" }));
      load(reviewerEmail);
    } else {
      setActionMsgs((m) => ({ ...m, [applicantEmail]: "Approved" }));
    }
    setBusy((b) => ({ ...b, [applicantEmail]: false }));
  };

  const reject = async (applicantEmail: string) => {
    if (!reviewerEmail) return;
    setBusy((b) => ({ ...b, [applicantEmail]: true }));
    setApplications((prev) => prev?.filter((a) => a.email !== applicantEmail) ?? prev);
    setActionMsgs((m) => ({ ...m, [applicantEmail]: "Rejecting…" }));
    const res = await fetch("/api/tfc/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantEmail, reviewerEmail, reason: rejectReason.trim() }),
    });
    if (!res.ok) {
      setActionMsgs((m) => ({ ...m, [applicantEmail]: "Failed — refreshing" }));
      load(reviewerEmail);
    } else {
      setActionMsgs((m) => ({ ...m, [applicantEmail]: "Rejected" }));
    }
    setRejectingEmail(null);
    setRejectReason("");
    setBusy((b) => ({ ...b, [applicantEmail]: false }));
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", background: BG, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: "0.2em", color: "rgba(255,255,255,0.6)" }}>
          AUTHENTICATING…
        </div>
      </div>
    );
  }

  if (!reviewerEmail) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        color: "#fff",
        padding: "28px 24px 60px",
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 36,
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          paddingBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
              fontSize: 42,
              letterSpacing: "0.1em",
              color: "#ffffff",
              lineHeight: 1,
            }}
          >
            TFC APPLICATIONS
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
              marginTop: 4,
              letterSpacing: "0.12em",
              fontFamily: "monospace",
            }}
          >
            REVIEW PENDING CREW APPLICATIONS
          </div>
        </div>
        <button onClick={() => router.push("/studio")} style={btnStyle("ghost")}>
          ← Back
        </button>
      </div>

      {/* List */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionTitle}>
          {applications === null
            ? "Loading…"
            : applications.length === 0
            ? "No pending applications"
            : `${applications.length} Pending`}
        </div>

        {applications && applications.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {applications.map((app) => (
              <div key={app.email} style={card}>
                {/* Top row: identity + actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    marginBottom: 14,
                  }}
                >
                  {app.avatarUrl ? (
                    <img
                      src={app.avatarUrl}
                      alt=""
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                        border: "1px solid rgba(255,255,255,0.25)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
                        fontSize: 20,
                        color: CYAN,
                        flexShrink: 0,
                      }}
                    >
                      {app.email[0].toUpperCase()}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#fff",
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {app.displayName ?? app.email.split("@")[0]}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.6)",
                        fontFamily: "monospace",
                        marginBottom: 6,
                      }}
                    >
                      {app.email}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.35)",
                        letterSpacing: "0.06em",
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                      }}
                    >
                      Applied {formatDate(app.appliedAt)}
                    </div>
                  </div>

                  {rejectingEmail !== app.email && (
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => approve(app.email)}
                        disabled={busy[app.email]}
                        style={btnStyle("cyan")}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejectingEmail(app.email);
                          setRejectReason("");
                        }}
                        disabled={busy[app.email]}
                        style={btnStyle("danger")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Languages / domains */}
                {(app.languages.length > 0 || app.domains.length > 0) && (
                  <div style={{ marginBottom: 12 }}>
                    {app.languages.length > 0 && (
                      <div style={{ marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 9,
                            letterSpacing: "0.18em",
                            color: "rgba(255,255,255,0.6)",
                            fontFamily: "monospace",
                            marginRight: 8,
                          }}
                        >
                          LANGUAGES
                        </span>
                        {app.languages.map((l) => (
                          <span key={l} style={chip}>
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                    {app.domains.length > 0 && (
                      <div>
                        <span
                          style={{
                            fontSize: 9,
                            letterSpacing: "0.18em",
                            color: "rgba(255,255,255,0.6)",
                            fontFamily: "monospace",
                            marginRight: 8,
                          }}
                        >
                          DOMAINS
                        </span>
                        {app.domains.map((d) => (
                          <span key={d} style={chip}>
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Motivation */}
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.78)",
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: 8,
                    padding: "12px 14px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {app.motivation || (
                    <span style={{ color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>
                      No motivation provided
                    </span>
                  )}
                </div>

                {/* Reject reason input */}
                {rejectingEmail === app.email && (
                  <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason (optional) — will be stored in notification metadata"
                      autoFocus
                      style={inputStyle}
                    />
                    <button
                      onClick={() => reject(app.email)}
                      disabled={busy[app.email]}
                      style={btnStyle("danger")}
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => {
                        setRejectingEmail(null);
                        setRejectReason("");
                      }}
                      style={btnStyle("ghost")}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {actionMsgs[app.email] && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 11,
                      color: CYAN,
                      letterSpacing: "0.1em",
                      fontFamily: "monospace",
                    }}
                  >
                    {actionMsgs[app.email]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

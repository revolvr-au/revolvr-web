"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import RingRim from "@/components/RingRim";
import { useRingStatus } from "@/hooks/useRingStatus";

const supabase = createSupabaseBrowserClient();

// ── Ring display config ──────────────────────────────────────────────────────
const RING_DISPLAY: Record<string, { color: string; label: string }> = {
  NONE:       { color: "rgba(255,255,255,0.25)", label: "No Ring" },
  BLUE:       { color: "#3B82F6",  label: "Blue Ring" },
  GOLD:       { color: "#F59E0B",  label: "Gold Ring" },
  BUSINESS:   { color: "#8B5CF6",  label: "Business Ring" },
  CORPORATE:  { color: "#6366F1",  label: "Corporate Ring" },
  RED:        { color: "#EF4444",  label: "Red Ring" },
  GOVERNMENT: { color: "#10B981",  label: "Government Ring" },
};

// ── Shared style tokens ──────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "20px 20px",
  marginBottom: 12,
};

const sectionLabel: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 10,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.35)",
  marginBottom: 16,
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontFamily: "monospace",
  letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.45)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  color: "white",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatCents(cents: number): string {
  return `AUD $${(cents / 100).toFixed(2)}`;
}

function memberSince(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

function safeKey(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", fontFamily: "monospace", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{
        fontSize: 13,
        color: accent ?? "rgba(255,255,255,0.7)",
        maxWidth: "62%",
        textAlign: "right",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {value}
      </span>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function MeClient() {
  const router = useRouter();
  const { ringTier, voltage, loading: ringLoading } = useRingStatus();

  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [me,            setMe]            = useState<Record<string, unknown> | null>(null);
  const [connect,       setConnect]       = useState<Record<string, unknown> | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [notice,        setNotice]        = useState<string | null>(null);
  const [avatarUrl,     setAvatarUrl]     = useState("");
  const [displayName,   setDisplayName]   = useState("");
  const [handle,        setHandle]        = useState("");
  const [bio,           setBio]           = useState("");
  const [avatarBusy,    setAvatarBusy]    = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const email     = (me?.user?.email ?? "").toLowerCase();
  const creator   = me?.creator  ?? null;
  const balance   = me?.balance  ?? null;
  const isCreator = Boolean(creator);
  const ring      = RING_DISPLAY[ringTier] ?? RING_DISPLAY.NONE;
  const hasRing   = ringTier !== "NONE";

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let dead = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const { data: sd } = await supabase.auth.getSession();
        const token = sd.session?.access_token;
        if (!token) { router.replace("/login"); return; }

        const meRes  = await fetch("/api/creator/me", { cache: "no-store" });
        const meJson = await meRes.json().catch(() => null);
        if (dead) return;
        if (!meRes.ok || !meJson?.loggedIn) { router.replace("/login"); return; }

        setMe(meJson);
        const c = meJson.creator ?? null;
        setDisplayName(c?.displayName ?? "");
        setHandle(c?.handle ?? "");
        setAvatarUrl(c?.avatarUrl ?? "");
        setBio(c?.bio ?? "");

        // Stripe connect status (non-fatal)
        const stRes  = await fetch("/api/stripe/connect/status", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const stJson = await stRes.json().catch(() => null);
        if (!dead) setConnect(stRes.ok ? stJson : { error: stJson?.error ?? "Could not load payouts status." });
      } catch (e: unknown) {
        if (!dead) setError(e instanceof Error ? e.message : "Failed to load profile.");
      } finally {
        if (!dead) setLoading(false);
      }
    }

    run();
    return () => { dead = true; };
  }, [router]);

  // ── Avatar upload ─────────────────────────────────────────────────────────
  async function uploadAvatar(file: File): Promise<string> {
    if (!email) throw new Error("Not signed in");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const key = `avatars/${safeKey(email)}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(key, file, {
      cacheControl: "3600", upsert: true, contentType: file.type || "image/jpeg",
    });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("avatars").getPublicUrl(key);
    if (!data?.publicUrl) throw new Error("Could not resolve avatar URL");
    return data.publicUrl;
  }

  // ── Save profile ──────────────────────────────────────────────────────────
  async function saveProfile() {
    if (!displayName.trim()) { setError("Display name is required."); return; }
    setError(null); setNotice(null); setSaving(true);
    try {
      const res = await fetch("/api/profile/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          handle: handle.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) { setError(payload?.error ?? "Save failed."); return; }
      setNotice("Profile saved.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  // ── Connect Stripe ────────────────────────────────────────────────────────
  async function connectStripe() {
    setError(null); setNotice(null); setSaving(true);
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd.session?.access_token;
      if (!token) { router.replace("/login"); return; }

      const res = await fetch("/api/stripe/connect/link", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) { router.push("/creator/terms?next=/me"); return; }
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.url) { setError(payload?.error ?? "Could not start Stripe onboarding."); return; }
      window.location.assign(payload.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not start Stripe onboarding.");
    } finally {
      setSaving(false);
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  async function signOut() {
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/welcome";
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: "#050814", color: "white", fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* ── HEADER ── */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(5,8,20,0.94)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        height: 56,
        padding: "0 16px",
      }}>
        <button
          onClick={() => router.push("/public-feed")}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 22, padding: "0 12px 0 0", lineHeight: 1, flexShrink: 0 }}
          aria-label="Back"
        >
          ←
        </button>
        <span style={{ flex: 1, textAlign: "center", fontFamily: "monospace", fontSize: 13, letterSpacing: "0.18em", color: "white" }}>
          ACCOUNT
        </span>
        <div style={{ width: 44 }} />
      </div>

      {/* ── BODY ── */}
      <div style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "20px 16px",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)",
      }}>

        {/* Alerts */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#fca5a5", marginBottom: 14 }}>
            {error}
          </div>
        )}
        {notice && (
          <div style={{ background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#00e5ff", marginBottom: 14 }}>
            {notice}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[116, 76, 120, 112, 64, 88].map((h, i) => (
              <div key={i} style={{ height: h, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }} />
            ))}
          </div>
        ) : (
          <>
            {/* ────────────────────────────────── SECTION 1 — IDENTITY */}
            <div style={card}>
              <div style={sectionLabel}>Identity</div>

              {/* Avatar row — circle + live cutout */}
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 24 }}>

                {/* Standard circle avatar */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <RingRim tier={ringLoading ? null : ringTier} size={88}>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={avatarBusy}
                        aria-label="Change photo"
                        style={{
                          width: 88, height: 88, borderRadius: "50%",
                          overflow: "hidden", border: "none",
                          cursor: avatarBusy ? "not-allowed" : "pointer",
                          opacity: avatarBusy ? 0.55 : 1,
                          background: avatarUrl
                            ? `url(${avatarUrl}) center/cover no-repeat`
                            : "linear-gradient(135deg, #0d1224, #1a1f35)",
                          display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 32,
                          color: "rgba(255,255,255,0.35)", flexShrink: 0,
                        }}
                      >
                        {!avatarUrl && ((displayName || email)?.[0]?.toUpperCase() ?? "?")}
                      </button>
                    </RingRim>
                    <div
                      onClick={() => !avatarBusy && fileRef.current?.click()}
                      style={{
                        position: "absolute", bottom: 2, right: 2,
                        width: 24, height: 24, borderRadius: "50%",
                        background: "#00e5ff", color: "#050814",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700, cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.5)", lineHeight: 1,
                      }}
                    >
                      +
                    </div>
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
                    PROFILE
                  </span>
                </div>

                {/* Live cutout avatar */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 88, height: 88,
                    border: "1px solid rgba(0,229,255,0.2)",
                    borderRadius: 12,
                    background: "rgba(0,229,255,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", position: "relative",
                  }}>
                    {(me as any)?.profile?.avatar_live_url || (me as any)?.creator?.avatarLiveUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(me as any)?.creator?.avatarLiveUrl || (me as any)?.profile?.avatar_live_url}
                        alt="Live avatar"
                        style={{
                          width: "100%", height: "100%", objectFit: "contain",
                          filter: "drop-shadow(0 0 8px rgba(0,229,255,0.4))",
                        }}
                      />
                    ) : (
                      <div style={{ textAlign: "center", padding: 8 }}>
                        {avatarBusy ? (
                          <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(0,229,255,0.5)", letterSpacing: "0.08em" }}>
                            PROCESSING…
                          </div>
                        ) : (
                          <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em", lineHeight: 1.6 }}>
                            UPLOAD PHOTO{"\n"}TO GENERATE
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(0,229,255,0.5)", letterSpacing: "0.1em" }}>
                    LIVE
                  </span>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setError(null); setAvatarBusy(true);
                  try {
                    const url = await uploadAvatar(f);
                    setAvatarUrl(url);
                    setNotice("Photo uploaded — tap Save to publish.");
                    // Fire and forget — user moves on immediately
                    fetch("/api/avatar/process", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ avatarUrl: url, email }),
                    }).catch(console.error);
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : "Upload failed.");
                  } finally {
                    setAvatarBusy(false);
                    e.currentTarget.value = "";
                  }
                }}
              />

              {/* Display name */}
              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  style={inputStyle}
                />
              </div>

              {/* Handle */}
              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>Handle</label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 14, top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(255,255,255,0.3)", fontSize: 14,
                    pointerEvents: "none",
                  }}>
                    @
                  </span>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="yourhandle"
                    style={{ ...inputStyle, paddingLeft: 28 }}
                  />
                </div>
              </div>

              {/* Bio */}
              <div style={{ marginBottom: 22 }}>
                <label style={fieldLabel}>
                  Bio
                  <span style={{
                    marginLeft: 8,
                    color: bio.length > 140 ? (bio.length >= 160 ? "#ef4444" : "#F59E0B") : "rgba(255,255,255,0.2)",
                  }}>
                    {bio.length}/160
                  </span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 160))}
                  placeholder="Short bio…"
                  rows={3}
                  style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
                />
              </div>

              {/* Save */}
              <button
                type="button"
                disabled={saving || !displayName.trim()}
                onClick={saveProfile}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  background: (saving || !displayName.trim()) ? "rgba(0,229,255,0.1)" : "#00e5ff",
                  color: (saving || !displayName.trim()) ? "rgba(0,229,255,0.6)" : "#050814",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  letterSpacing: "0.1em",
                  cursor: (saving || !displayName.trim()) ? "not-allowed" : "pointer",
                  transition: "all 0.18s",
                }}
              >
                {saving ? "SAVING…" : "SAVE CHANGES"}
              </button>
            </div>

            {/* ────────────────────────────────── SECTION 2 — RING STATUS */}
            <div style={card}>
              <div style={sectionLabel}>Ring Status</div>

              {ringLoading ? (
                <div style={{ height: 36, background: "rgba(255,255,255,0.04)", borderRadius: 8 }} />
              ) : hasRing ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: "50%",
                      background: ring.color,
                      boxShadow: `0 0 10px ${ring.color}80`,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: ring.color }}>
                      {ring.label}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push("/rings")}
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      padding: "7px 14px",
                      fontSize: 11,
                      fontFamily: "monospace",
                      letterSpacing: "0.1em",
                      color: "rgba(255,255,255,0.7)",
                      cursor: "pointer",
                    }}
                  >
                    MANAGE RING
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 14px", lineHeight: 1.7 }}>
                    Get a Ring to unlock creator tools, monetisation, and exclusive features.
                  </p>
                  <button
                    onClick={() => router.push("/rings")}
                    style={{
                      width: "100%",
                      height: 44,
                      borderRadius: 10,
                      background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.28)",
                      color: "#3B82F6",
                      fontSize: 12,
                      fontFamily: "monospace",
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    GET VERIFIED →
                  </button>
                </>
              )}
            </div>

            {/* ────────────────────────────────── SECTION 3 — ACCOUNT INFO */}
            <div style={card}>
              <div style={sectionLabel}>Account Info</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <InfoRow label="Email" value={email || "—"} />
                <InfoRow label="Account type" value={isCreator ? "Creator" : "Standard user"} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", fontFamily: "monospace", letterSpacing: "0.06em" }}>
                    Voltage
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#F59E0B", fontFamily: "monospace" }}>
                    ⚡ {voltage ?? 0}
                  </span>
                </div>
                <InfoRow
                  label="Member since"
                  value={memberSince(me?.profile?.createdAt ?? creator?.createdAt)}
                />
              </div>
            </div>

            {/* ────────────────────────────────── SECTION 4 — MONETISATION */}
            <div style={card}>
              <div style={sectionLabel}>Monetisation</div>

              {connect?.error ? (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "0 0 14px" }}>
                  {connect.error}
                </p>
              ) : connect?.connected ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B98180" }} />
                    <span style={{ fontSize: 12, color: "#10B981", fontFamily: "monospace", letterSpacing: "0.08em" }}>
                      STRIPE CONNECTED
                    </span>
                  </div>
                  {(balance?.totalEarnedCents ?? 0) > 0 && (
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                      Total earned:{" "}
                      <span style={{ color: "white", fontWeight: 600 }}>
                        {formatCents(balance.totalEarnedCents)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 14px", lineHeight: 1.7 }}>
                  Connect Stripe to receive gifts and tips from your viewers.
                </p>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  disabled={saving}
                  onClick={connectStripe}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 10,
                    background: connect?.connected ? "rgba(255,255,255,0.04)" : "rgba(16,185,129,0.1)",
                    border: connect?.connected ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(16,185,129,0.28)",
                    color: connect?.connected ? "rgba(255,255,255,0.6)" : "#10B981",
                    fontSize: 11,
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {connect?.connected ? "UPDATE STRIPE" : "CONNECT STRIPE"}
                </button>
                <button
                  onClick={() => router.push("/creator/earnings")}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 11,
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                    cursor: "pointer",
                  }}
                >
                  VIEW EARNINGS
                </button>
              </div>
            </div>

            {/* ────────────────────────────────── SECTION 5 — MESSAGES */}
            <div style={{ ...card, opacity: 0.55 }}>
              <div style={sectionLabel}>Messages</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>
                    🔒 Direct Messages
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)" }}>
                    Coming soon — Gold Ring
                  </div>
                </div>
              </div>
            </div>

            {/* ────────────────────────────────── SECTION 6 — SETTINGS */}
            <div style={card}>
              <div style={sectionLabel}>Settings</div>

              {/* Safety placeholder */}
              <div style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                marginBottom: 14,
              }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>
                  Safety &amp; preferences
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", lineHeight: 1.6 }}>
                  Content filters, blocked accounts, and privacy settings — coming soon.
                </div>
              </div>

              {/* Sign out */}
              <button
                onClick={signOut}
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  color: "#ef4444",
                  fontSize: 13,
                  fontFamily: "monospace",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                SIGN OUT
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import SlideUpSheet from "@/components/SlideUpSheet";
import { createSupabaseBrowserClient } from "@/supabase-browser";

type ControlPanelProps = {
  userId: string | null;
  onClose: () => void;
  isCreator?: boolean;
  isOwnProfile?: boolean;
  handle?: string;
};

type MyGath = {
  id: string;
  name: string;
  type: "OPEN" | "PRIVATE" | "BUSINESS";
  status: "PRELAUNCHING" | "ACTIVE" | "ARCHIVED";
  memberCount: number;
  role: "IGNITER" | "HOST" | "MEMBER";
};

const GOLD = "#ffffff";

function SparkGoldIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={GOLD}>
      <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
    </svg>
  );
}

export default function ControlPanel({
  userId,
  onClose,
  isCreator,
  isOwnProfile,
  handle,
}: ControlPanelProps) {
  const router = useRouter();
  const [logoutPending, setLogoutPending] = useState(false);
  const [myGaths, setMyGaths] = useState<MyGath[] | null>(null);
  const [canApplyTfc, setCanApplyTfc] = useState(false);
  const [resolvedHandle, setResolvedHandle] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setCanApplyTfc(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/tfc/status?email=${encodeURIComponent(userId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setCanApplyTfc(Boolean(data?.ok && data.status === "none"));
      })
      .catch(() => {
        if (!cancelled) setCanApplyTfc(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/gath/my-gaths?email=${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const gaths: MyGath[] = Array.isArray(data?.gaths)
          ? data.gaths.map((g: any) => ({
              id: g.id,
              name: g.name,
              type: g.type,
              status: g.status,
              memberCount: g.memberCount ?? 0,
              role: g.role,
            }))
          : [];
        setMyGaths(gaths);
      })
      .catch(() => {
        if (!cancelled) setMyGaths([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Resolve the user's real handle from their creator profile. We must NOT
  // guess it from the email local-part (e.g. "revolvr.au@…" -> "revolvr.au"),
  // because the actual handle is set at onboarding and is usually different —
  // guessing routes "View Profile" to /u/<wrong> and 404s the user's own page.
  useEffect(() => {
    if (handle || !userId) return;
    let cancelled = false;
    fetch(`/api/creator/me`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const h = data?.creator?.handle;
        setResolvedHandle(typeof h === "string" && h.trim() ? h : null);
      })
      .catch(() => {
        if (!cancelled) setResolvedHandle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, handle]);

  // The handle passed in by the caller wins; otherwise use the one we resolved
  // from /api/creator/me. No email-derived fallback.
  const profileHandle = handle ?? resolvedHandle;

  const navigate = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut({ scope: "global" });
    onClose();
    window.location.href = "/welcome";
  };

  return (
    <SlideUpSheet open={!!userId} onClose={onClose}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "rgba(5, 8, 20, 0.75)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: "16px",
          paddingBottom: `max(16px, env(safe-area-inset-bottom, 16px))`,
          gap: 16,
          height: "75dvh",
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4)",
          fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          position: "relative",
        }}
      >
        {/* Scanlines overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          opacity: 0.4,
        }} />

        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px 8px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)" }}>
            Control Panel
          </span>
          <button
            onClick={onClose}
            aria-label="Close control panel"
            type="button"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{
          height: 1,
          background: "linear-gradient(90deg, #ffffff, transparent)",
          marginBottom: 4,
          opacity: 0.3,
          position: "relative",
          zIndex: 1,
        }} />

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1, paddingBottom: 24 }} className="no-scrollbar">
          <button
            onClick={() => profileHandle && navigate(`/u/${profileHandle}`)}
            disabled={!profileHandle}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 20px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "none",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              width: "100%",
              textAlign: "left",
              cursor: profileHandle ? "pointer" : "default",
              opacity: profileHandle ? 1 : 0.55,
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (profileHandle) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)")}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                border: "1.5px solid rgba(255, 255, 255, 0.4)",
                background: "linear-gradient(135deg, #1a2030, #0a0e18)",
                flexShrink: 0,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", letterSpacing: "0.02em" }}>
                {profileHandle ? `@${profileHandle}` : "View Profile"}
              </span>
              <span style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 11, fontFamily: "monospace", letterSpacing: "0.05em" }}>
                {userId}
              </span>
            </div>
          </button>

          {/* MY GATHS */}
          <div style={{ padding: "12px 20px 8px" }}>
            <div
              style={{
                fontSize: 9,
                fontFamily: "monospace",
                letterSpacing: 2,
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase",
                paddingBottom: 8,
              }}
            >
              MY GATHS
            </div>

            {myGaths === null ? (
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "rgba(255,255,255,0.6)",
                  letterSpacing: "0.18em",
                  padding: "8px 0",
                }}
              >
                LOADING…
              </div>
            ) : myGaths.length === 0 ? (
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "rgba(255,255,255,0.6)",
                  letterSpacing: "0.22em",
                  padding: "8px 0",
                }}
              >
                NO GATHS YET
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {myGaths.slice(0, 3).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => navigate(`/gath/${g.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 10,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid rgba(255,255,255,0.4)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <SparkGoldIcon size={12} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#fff",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {g.name}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 3,
                          fontFamily: "monospace",
                          fontSize: 8,
                          letterSpacing: "0.18em",
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        <span>{g.memberCount} MEMBERS</span>
                        <span
                          style={{
                            padding: "1px 5px",
                            border: `1px solid ${g.type === "BUSINESS" ? GOLD : "rgba(255,255,255,0.12)"}`,
                            borderRadius: 4,
                            color: g.type === "BUSINESS" ? GOLD : "rgba(255,255,255,0.7)",
                          }}
                        >
                          {g.type}
                        </span>
                      </div>
                    </div>
                    {g.role === "IGNITER" && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 6px",
                          border: `1px solid ${GOLD}`,
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.06)",
                          fontFamily: "monospace",
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: "0.22em",
                          color: GOLD,
                          flexShrink: 0,
                        }}
                      >
                        <SparkGoldIcon size={8} />
                        IGNITER
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate("/people")}
              style={{
                marginTop: 10,
                background: "transparent",
                border: "none",
                color: GOLD,
                fontFamily: "monospace",
                fontSize: 9,
                letterSpacing: "0.24em",
                cursor: "pointer",
                padding: 0,
              }}
            >
              SEE ALL GATHS →
            </button>
          </div>

          <MenuDivider />

          {/* ACCOUNT */}
          <MenuSection label="ACCOUNT">
            {isOwnProfile && handle && (
              <MenuItem onClick={() => navigate(`/u/${handle}`)}>Edit Profile</MenuItem>
            )}
            <MenuItem onClick={() => navigate("/settings")}>Settings</MenuItem>
            <MenuItem onClick={() => navigate("/notifications")}>Notifications</MenuItem>
            {logoutPending ? (
              <div style={{ padding: "10px 20px" }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>Confirm log out?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: 50,
                      background: "transparent",
                      border: "1px solid #ff3b30",
                      color: "#ff3b30",
                      fontSize: 11,
                      fontFamily: "monospace",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setLogoutPending(false)}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: 50,
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.3)",
                      color: "#aaa",
                      fontSize: 11,
                      fontFamily: "monospace",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <MenuItem onClick={() => setLogoutPending(true)}>Log Out</MenuItem>
            )}
            <MenuItem onClick={() => navigate("/account/delete")}>Delete Account</MenuItem>
          </MenuSection>

          <MenuDivider />

          {/* CREATOR */}
          {isCreator ? (
            <>
              <MenuSection label="CREATOR">
                <MenuItem onClick={() => navigate("/creator/earnings")}>Earnings Dashboard</MenuItem>
                <MenuItem onClick={() => navigate("/creator/payout")}>Payout Settings</MenuItem>
                <MenuItem onClick={() => navigate("/legal/creator-terms")}>Creator Terms</MenuItem>
              </MenuSection>
              <MenuDivider />
            </>
          ) : (
            <>
              <MenuSection label="CREATOR">
                <MenuItem onClick={() => navigate("/creator/onboard")}>Become a Creator</MenuItem>
              </MenuSection>
              <MenuDivider />
            </>
          )}

          {/* TRANCHE */}
          {canApplyTfc && (
            <>
              <MenuSection label="TRANCHE">
                <MenuItem onClick={() => navigate("/tfc/apply")}>Apply for TFC Crew</MenuItem>
              </MenuSection>
              <MenuDivider />
            </>
          )}

          {/* LEGAL */}
          <MenuSection label="LEGAL">
            <MenuItem onClick={() => navigate("/legal/privacy")}>Privacy Policy</MenuItem>
            <MenuItem onClick={() => navigate("/legal/guidelines")}>Community Guidelines</MenuItem>
            <MenuItem onClick={() => navigate("/legal/terms")}>Terms & Conditions</MenuItem>
            <MenuItem onClick={() => navigate("/legal/age-verification")}>Age Verification Policy</MenuItem>
          </MenuSection>

          <MenuDivider />

          {/* PLATFORM */}
          <MenuSection label="PLATFORM">
            <MenuItem onClick={() => navigate("/about")}>About REVOLVR</MenuItem>
            <MenuItem onClick={() => navigate("/about/tranche")}>About TRANCHE</MenuItem>
            <MenuItem onClick={() => { onClose(); window.location.href = "mailto:revolvrassist@gmail.com"; }}>
              Help & Support
            </MenuItem>
            <MenuItem onClick={() => { onClose(); window.location.href = "mailto:revolvrassist@gmail.com"; }}>
              Contact Us
            </MenuItem>
          </MenuSection>
        </div>
      </div>
    </SlideUpSheet>
  );
}

function MenuSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{
        fontSize: 9,
        fontFamily: "monospace",
        letterSpacing: 2,
        color: "rgba(255,255,255,0.6)",
        textTransform: "uppercase",
        padding: "0 20px 8px",
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function MenuDivider() {
  return <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />;
}

function MenuItem({
  onClick,
  children,
  badge,
}: {
  onClick: () => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        textAlign: "left",
        padding: "12px 20px",
        fontSize: 13,
        color: "#aaa",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
    >
      {children}
      {badge && (
        <span style={{
          fontSize: 8,
          fontFamily: "monospace",
          letterSpacing: 1,
          color: "#ffffff",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 4,
          padding: "1px 5px",
          textTransform: "uppercase",
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}
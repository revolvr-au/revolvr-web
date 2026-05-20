"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

export default function ControlPanel({
  userId,
  onClose,
  isCreator,
  isOwnProfile,
  handle,
}: ControlPanelProps) {
  const router = useRouter();
  const [logoutPending, setLogoutPending] = useState(false);

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
          boxShadow: "0 0 60px rgba(0,229,255,0.06), 0 8px 32px rgba(0,0,0,0.4)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
          background: "linear-gradient(90deg, #00e5ff, transparent)",
          marginBottom: 4,
          opacity: 0.3,
          position: "relative",
          zIndex: 1,
        }} />

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1, paddingBottom: 24 }} className="no-scrollbar">
          <div style={{ padding: "16px 20px 8px" }}>
            <p style={{ fontSize: 13, color: "#888", margin: 0, fontFamily: "monospace" }}>
              Viewing: <span style={{ color: "#00e5ff" }}>{userId}</span>
            </p>
          </div>

          <MenuDivider />

          {/* ACCOUNT */}
          <MenuSection label="ACCOUNT">
            {isOwnProfile && handle && (
              <MenuItem onClick={() => navigate(`/u/${handle}`)}>Edit Profile</MenuItem>
            )}
            <MenuItem onClick={() => navigate("/settings")}>Settings</MenuItem>
            <MenuItem onClick={() => {}} badge="Coming Soon">Notifications</MenuItem>
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
        color: "#555",
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
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          color: "#00e5ff",
          border: "1px solid rgba(0,229,255,0.3)",
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
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  isCreator?: boolean;
  isOwnProfile?: boolean;
  handle?: string;
};

export default function HamburgerMenu({ isOpen, onClose, isCreator, isOwnProfile, handle }: Props) {
  const router = useRouter();
  const [logoutPending, setLogoutPending] = useState(false);
  const [canApplyTfc, setCanApplyTfc] = useState(false);

  useEffect(() => {
    if (!isOpen) setLogoutPending(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(async ({ data }) => {
      const email = data.user?.email;
      if (!email) {
        if (!cancelled) setCanApplyTfc(false);
        return;
      }
      try {
        const res = await fetch(`/api/tfc/status?email=${encodeURIComponent(email)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!cancelled) setCanApplyTfc(json?.ok && json.status === "none");
      } catch {
        if (!cancelled) setCanApplyTfc(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

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
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 400,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.28s ease",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          width: 280,
          background: "#0a0806",
          zIndex: 401,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s ease",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #1a1510",
        }}
      >
        {/* Close button */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px 20px 12px" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#555",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* ACCOUNT */}
        <MenuSection label="ACCOUNT">
          {isOwnProfile && handle && (
            <MenuItem onClick={() => navigate(`/u/${handle}`)}>Edit Profile</MenuItem>
          )}
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
                    border: "1px solid #333",
                    color: "#555",
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
    </>
  );
}

function MenuSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{
        fontSize: 9,
        fontFamily: "monospace",
        letterSpacing: 2,
        color: "#333",
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
  return <div style={{ borderTop: "1px solid #1a1510", margin: "4px 0" }} />;
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

"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import { isAdminEmail } from "@/lib/isAdmin";
import StudioDashboard from "./StudioDashboard";

const supabase = createSupabaseBrowserClient();
const LOCK_TIMEOUT = 120;

type PageStatus = "loading" | "login" | "dashboard";
type LoginState = "idle" | "submitting" | "sent";

async function writeAudit(action: string) {
  try {
    await fetch("/api/studio/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  } catch {}
}

export default function StudioPage() {
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [confirmedEmail, setConfirmedEmail] = useState<string | undefined>(undefined);
  const [studioRole, setStudioRole] = useState("ADMIN");
  const [emailInput, setEmailInput] = useState("");
  const [loginState, setLoginState] = useState<LoginState>("idle");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  // ── Initial auth check ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userEmail = data.user?.email ?? null;
      console.log("[studio] getUser email:", userEmail);
      if (userEmail && isAdminEmail(userEmail)) {
        setConfirmedEmail(userEmail);
        // Fetch role (upserts StudioUser as a side-effect)
        fetch("/api/studio/me")
          .then((r) => (r.ok ? r.json() : { role: "ADMIN" }))
          .then((d) => setStudioRole(d.role ?? "ADMIN"))
          .catch(() => {});
        // Log the page load
        writeAudit("studio_login");
        setPageStatus("dashboard");
      } else {
        setPageStatus("login");
      }
    });
  }, []);

  // ── Inactivity lock ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (pageStatus !== "dashboard") return;

    lastActivityRef.current = Date.now();
    let didLock = false;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      setLockCountdown(null);
    };

    window.addEventListener("mousemove", resetActivity, { passive: true });
    window.addEventListener("click", resetActivity, { passive: true });
    window.addEventListener("keypress", resetActivity, { passive: true });

    const tick = setInterval(async () => {
      if (didLock) return;
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = LOCK_TIMEOUT - elapsed;

      if (remaining <= 0) {
        didLock = true;
        clearInterval(tick);
        await writeAudit("session_locked");
        setLockCountdown(null);
        setLockMessage("Session locked due to inactivity. Please re-authenticate.");
        setPageStatus("login");
      } else if (remaining <= 30) {
        setLockCountdown(remaining);
      } else {
        setLockCountdown(null);
      }
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", resetActivity);
      window.removeEventListener("click", resetActivity);
      window.removeEventListener("keypress", resetActivity);
      clearInterval(tick);
    };
  }, [pageStatus]);

  // ── OTP submit ──────────────────────────────────────────────────────────────
  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginState("submitting");
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { emailRedirectTo: "https://www.revolvr.net/studio/auth/callback" },
    });
    if (error) {
      setLoginError(error.message);
      setLoginState("idle");
    } else {
      setLoginState("sent");
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (pageStatus === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#050814", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontFamily: "sans-serif", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  if (pageStatus === "dashboard" && confirmedEmail) {
    return (
      <StudioDashboard
        email={confirmedEmail}
        studioRole={studioRole}
        lockCountdown={lockCountdown}
      />
    );
  }

  // ── Login screen ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: rgba(255,255,255,0.25); }
        input:focus { border-color: rgba(0,229,255,0.5) !important; outline: none; }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#050814", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "0 24px" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Header */}
          <h1 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 56, color: "#ffffff", letterSpacing: "0.08em", textAlign: "center", margin: "0 0 4px", lineHeight: 1 }}>
            REVOLVR STUDIO
          </h1>
          <p style={{ textAlign: "center", color: "#00e5ff", fontFamily: "monospace", fontSize: 12, letterSpacing: "0.18em", margin: "0 0 40px" }}>
            COMMAND &amp; CONTROL
          </p>

          {/* Lock message */}
          {lockMessage && (
            <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#fbbf24", fontSize: 13, textAlign: "center" }}>
              {lockMessage}
            </div>
          )}

          {loginState === "sent" ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#00e5ff", fontSize: 16, margin: "0 0 20px", letterSpacing: "0.02em" }}>
                Access code sent. Check your email.
              </p>
              <p style={{ color: "#ef4444", fontSize: 11, margin: 0, letterSpacing: "0.06em", opacity: 0.7 }}>
                AUTHORISED PERSONNEL ONLY. ALL ACCESS IS LOGGED.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRequestAccess} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                placeholder="Email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#ffffff",
                  fontSize: 15,
                  padding: "13px 16px",
                  width: "100%",
                  transition: "border-color 0.15s",
                }}
              />
              {loginError && (
                <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginState === "submitting"}
                style={{
                  background: loginState === "submitting" ? "rgba(0,229,255,0.3)" : "#00e5ff",
                  color: "#050814",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "14px 0",
                  cursor: loginState === "submitting" ? "not-allowed" : "pointer",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase" as const,
                }}
              >
                {loginState === "submitting" ? "Sending…" : "Request Access"}
              </button>
              <p style={{ color: "#ef4444", fontSize: 11, margin: "4px 0 0", textAlign: "center", letterSpacing: "0.06em", opacity: 0.7 }}>
                AUTHORISED PERSONNEL ONLY. ALL ACCESS IS LOGGED.
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

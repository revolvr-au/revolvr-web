"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import { isAdminEmail } from "@/lib/isAdmin";
import StudioDashboard from "./StudioDashboard";

const supabase = createSupabaseBrowserClient();
const LOCK_TIMEOUT = 120;

// email → code → verifying → (unlocked or denied)
type LoginStep = "email" | "submitting" | "code" | "verifying" | "denied";

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
  // studioUnlocked starts false on every mount — no auto-unlock from existing session
  const [studioUnlocked, setStudioUnlocked] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState<string | undefined>(undefined);
  const [studioRole, setStudioRole] = useState("ADMIN");

  const [emailInput, setEmailInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [loginStep, setLoginStep] = useState<LoginStep>("email");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  // ── Inactivity lock — only runs while unlocked ───────────────────────────
  useEffect(() => {
    if (!studioUnlocked) return;

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
        setCodeInput("");
        setLoginStep("email");
        setLoginError(null);
        setLockMessage("Session locked due to inactivity. Please re-authenticate.");
        setStudioUnlocked(false);
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
  }, [studioUnlocked]);

  // ── Step 1: Send OTP code (no magic link — user stays on page) ───────────
  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginStep("submitting");
    const { error } = await supabase.auth.signInWithOtp({ email: emailInput });
    if (error) {
      setLoginError(error.message);
      setLoginStep("email");
    } else {
      setLoginStep("code");
    }
  }

  // ── Step 2: Verify the 6-digit code ─────────────────────────────────────
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginStep("verifying");

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: emailInput,
      token: codeInput,
      type: "email",
    });

    if (verifyError) {
      setLoginError(verifyError.message);
      setLoginStep("code");
      return;
    }

    // Confirm admin — getUser() verifies JWT directly
    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email ?? null;

    if (!userEmail || !isAdminEmail(userEmail)) {
      setLoginError(null);
      setLoginStep("denied");
      return;
    }

    setConfirmedEmail(userEmail);
    fetch("/api/studio/me")
      .then((r) => (r.ok ? r.json() : { role: "ADMIN" }))
      .then((d) => setStudioRole(d.role ?? "ADMIN"))
      .catch(() => {});
    writeAudit("studio_login");
    setLockMessage(null);
    setStudioUnlocked(true);
  }

  // ── Dashboard — only when explicitly unlocked ────────────────────────────
  if (studioUnlocked && confirmedEmail) {
    return (
      <StudioDashboard
        email={confirmedEmail}
        studioRole={studioRole}
        lockCountdown={lockCountdown}
      />
    );
  }

  // ── Login screen ─────────────────────────────────────────────────────────
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

          <h1 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 56, color: "#ffffff", letterSpacing: "0.08em", textAlign: "center", margin: "0 0 4px", lineHeight: 1 }}>
            REVOLVR STUDIO
          </h1>
          <p style={{ textAlign: "center", color: "#00e5ff", fontFamily: "monospace", fontSize: 12, letterSpacing: "0.18em", margin: "0 0 40px" }}>
            COMMAND &amp; CONTROL
          </p>

          {lockMessage && (
            <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#fbbf24", fontSize: 13, textAlign: "center" }}>
              {lockMessage}
            </div>
          )}

          {/* Email entry */}
          {(loginStep === "email" || loginStep === "submitting") && (
            <form onSubmit={handleRequestAccess} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                placeholder="Email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                disabled={loginStep === "submitting"}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#ffffff", fontSize: 15, padding: "13px 16px", width: "100%" }}
              />
              {loginError && <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{loginError}</p>}
              <button
                type="submit"
                disabled={loginStep === "submitting"}
                style={{ background: loginStep === "submitting" ? "rgba(0,229,255,0.3)" : "#00e5ff", color: "#050814", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, padding: "14px 0", cursor: loginStep === "submitting" ? "not-allowed" : "pointer", letterSpacing: "0.12em", textTransform: "uppercase" as const }}
              >
                {loginStep === "submitting" ? "Sending…" : "Request Access"}
              </button>
              <p style={{ color: "#ef4444", fontSize: 11, margin: "4px 0 0", textAlign: "center", letterSpacing: "0.06em", opacity: 0.7 }}>
                AUTHORISED PERSONNEL ONLY. ALL ACCESS IS LOGGED.
              </p>
            </form>
          )}

          {/* Code entry */}
          {(loginStep === "code" || loginStep === "verifying") && (
            <form onSubmit={handleVerifyCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ color: "#00e5ff", fontSize: 14, margin: "0 0 4px", textAlign: "center" }}>
                Access code sent. Check your email.
              </p>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoFocus
                disabled={loginStep === "verifying"}
                maxLength={6}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#ffffff", fontSize: 28, padding: "13px 16px", width: "100%", textAlign: "center", letterSpacing: "0.35em", fontFamily: "monospace" }}
              />
              {loginError && <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{loginError}</p>}
              <button
                type="submit"
                disabled={loginStep === "verifying" || codeInput.length < 6}
                style={{ background: loginStep === "verifying" || codeInput.length < 6 ? "rgba(0,229,255,0.3)" : "#00e5ff", color: "#050814", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, padding: "14px 0", cursor: loginStep === "verifying" || codeInput.length < 6 ? "not-allowed" : "pointer", letterSpacing: "0.12em", textTransform: "uppercase" as const }}
              >
                {loginStep === "verifying" ? "Verifying…" : "Verify Code"}
              </button>
              <button
                type="button"
                onClick={() => { setLoginStep("email"); setCodeInput(""); setLoginError(null); }}
                style={{ background: "transparent", color: "rgba(255,255,255,0.3)", border: "none", fontSize: 12, cursor: "pointer", padding: "4px 0" }}
              >
                ← Use a different email
              </button>
              <p style={{ color: "#ef4444", fontSize: 11, margin: "4px 0 0", textAlign: "center", letterSpacing: "0.06em", opacity: 0.7 }}>
                AUTHORISED PERSONNEL ONLY. ALL ACCESS IS LOGGED.
              </p>
            </form>
          )}

          {/* Access denied */}
          {loginStep === "denied" && (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#ef4444", fontSize: 15, margin: "0 0 12px" }}>Access denied.</p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: "0 0 24px" }}>
                You are not authorised to access REVOLVR STUDIO.
              </p>
              <button
                onClick={() => { setLoginStep("email"); setCodeInput(""); setEmailInput(""); setLoginError(null); }}
                style={{ background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, padding: "10px 20px", cursor: "pointer" }}
              >
                Try again
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

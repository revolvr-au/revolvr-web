"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import { isAdminEmail } from "@/lib/isAdmin";
import StudioDashboard from "./StudioDashboard";

const supabase = createSupabaseBrowserClient();

type PageStatus = "loading" | "login" | "dashboard";
type LoginState = "idle" | "submitting" | "sent";

export default function StudioPage() {
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [confirmedEmail, setConfirmedEmail] = useState<string | undefined>(undefined);
  const [emailInput, setEmailInput] = useState("");
  const [loginState, setLoginState] = useState<LoginState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userEmail = data.user?.email ?? null;
      console.log("[studio] getUser email:", userEmail);
      if (userEmail && isAdminEmail(userEmail)) {
        setConfirmedEmail(userEmail);
        setPageStatus("dashboard");
      } else {
        setPageStatus("login");
      }
    });
  }, []);

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoginState("submitting");
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { emailRedirectTo: "https://www.revolvr.net/studio/auth/callback" },
    });
    if (otpError) {
      setError(otpError.message);
      setLoginState("idle");
    } else {
      setLoginState("sent");
    }
  }

  if (pageStatus === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#050814", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontFamily: "sans-serif", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (pageStatus === "dashboard" && confirmedEmail) {
    return <StudioDashboard email={confirmedEmail} />;
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>
      <div style={{ minHeight: "100vh", background: "#050814", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
          <h1 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 52, color: "#00ffff", letterSpacing: "0.08em", textAlign: "center", margin: "0 0 6px" }}>
            REVOLVR STUDIO
          </h1>
          <p style={{ textAlign: "center", color: "#4b5563", fontSize: 13, margin: "0 0 40px", letterSpacing: "0.05em" }}>
            ADMIN ACCESS ONLY
          </p>

          {loginState === "sent" ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <p style={{ color: "#00ffff", fontSize: 16, margin: "0 0 8px" }}>Check your email</p>
              <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>A magic link has been sent to {emailInput}</p>
            </div>
          ) : (
            <form onSubmit={handleRequestAccess} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input
                type="email"
                placeholder="Email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                style={{
                  background: "#0d1117",
                  border: "1px solid #1e2a3a",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 15,
                  padding: "13px 16px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              {error && (
                <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loginState === "submitting"}
                style={{
                  background: loginState === "submitting" ? "#064e4e" : "#00ffff",
                  color: "#050814",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 700,
                  padding: "13px 0",
                  cursor: loginState === "submitting" ? "not-allowed" : "pointer",
                  letterSpacing: "0.05em",
                }}
              >
                {loginState === "submitting" ? "Sending…" : "Request Access"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

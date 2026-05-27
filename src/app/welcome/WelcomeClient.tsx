"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Step = "email" | "code";

const safeRedirect = (v: string | null) => {
  if (!v) return "/public-feed";
  if (!v.startsWith("/")) return "/public-feed";
  if (v.startsWith("//")) return "/public-feed";
  if (v.includes("\\")) return "/public-feed";
  return v;
};

export default function WelcomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    return safeRedirect(searchParams?.get("redirectTo") ?? null);
  }, [searchParams]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string>("");

  const loading = status === "loading";

  async function _signInWithProvider(provider: "google" | "apple") {
    // OAuth not configured yet
    console.warn(`[auth] ${provider} sign-in coming soon`);
    return;

    // (keep this block for later when enabled)
    // setStatus("loading");
    // setError("");
    // const { error } = await supabase.auth.signInWithOAuth({
    //   provider,
    //   options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}` },
    // });
    // if (error) { setStatus("error"); setError(error.message ?? "Something went wrong."); }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setStatus("error");
      setError("Please enter your email.");
      return;
    }

    // IMPORTANT: omit emailRedirectTo so we don't rely on callback cookies
    const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail });

    if (error) {
      console.error("[welcome] signInWithOtp error", error);
      setStatus("error");
      setError("Could not send code.");
      return;
    }

    setStatus("sent");
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanCode) {
      setStatus("error");
      setError("Enter the code from your email.");
      return;
    }

    const r = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, token: cleanCode }),
    });

    const j = (await r.json().catch(() => null)) as { ok?: boolean } | null;

    if (!r.ok || !j?.ok) {
      setStatus("error");
      setError("Invalid or expired code. Try again.");
      return;
    }

    // SSR cookies now exist; give them a moment to settle
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.href = "/";
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0d0d0d",
    border: "1px solid #1a1a1a",
    color: "white",
    borderRadius: 50,
    padding: "14px 20px",
    fontSize: 15,
    boxSizing: "border-box",
    outline: "none",
  };

  const ctaButtonStyle: React.CSSProperties = {
    marginTop: 12,
    width: "100%",
    background: "transparent",
    border: "1px solid #00e5ff",
    color: "#00e5ff",
    borderRadius: 50,
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 16,
    letterSpacing: 2,
    padding: "14px",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "monospace",
    fontSize: 10,
    color: "#555",
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "left",
    marginBottom: 8,
  };

  return (
    <div style={{ position: "relative", minHeight: "100dvh", overflow: "hidden", background: "#060606" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .rvlr-input:focus { border-color: #00e5ff !important; }
        @keyframes arcSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Background image tiles */}
      <img
        src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400"
        alt=""
        aria-hidden="true"
        style={{ position: "absolute", left: 0, top: 60, width: 180, height: 220, objectFit: "cover", opacity: 0.12, filter: "blur(2px)" }}
      />
      <img
        src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400"
        alt=""
        aria-hidden="true"
        style={{ position: "absolute", right: 0, top: 60, width: 180, height: 220, objectFit: "cover", opacity: 0.12, filter: "blur(2px)" }}
      />
      <img
        src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"
        alt=""
        aria-hidden="true"
        style={{ position: "absolute", left: "50%", top: 60, transform: "translateX(-50%)", width: 180, height: 220, objectFit: "cover", opacity: 0.12, filter: "blur(2px)" }}
      />

      {/* Dark gradient overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to bottom, rgba(6,6,6,0.4) 0%, rgba(6,6,6,0.85) 60%, #060606 100%)",
      }} />

      {/* Wordmark — centred header */}
      <div style={{
        position: "absolute",
        top: 28,
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 28,
        letterSpacing: 10,
        color: "white",
        zIndex: 10,
        whiteSpace: "nowrap",
      }}>REVOLVR</div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", paddingTop: "clamp(160px, 35vw, 200px)", paddingLeft: 24, paddingRight: 24, paddingBottom: 48 }}>

        {/* Avatar cluster */}
        <div style={{ position: "relative", width: "100%", maxWidth: 420, margin: "0 auto", marginTop: "-60px", height: 220 }}>

          {/* Avatar 1 — top left: spinning cyan arc */}
          <div style={{ position: "absolute", left: "10%", top: 40 }}>
            <div style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "#00e5ff",
              borderRightColor: "#00e5ff",
              animation: "arcSpin 3s linear infinite",
            }} />
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
              alt=""
              aria-hidden="true"
              style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", display: "block" }}
            />
          </div>

          {/* Avatar 2 — top right: solid cyan ring */}
          <div style={{ position: "absolute", right: "10%", top: 20 }}>
            <img
              src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150"
              alt=""
              aria-hidden="true"
              style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", display: "block", border: "2px solid #00e5ff" }}
            />
          </div>

          {/* Avatar 3 — centre middle: red ring + pulsing LIVE badge */}
          <div style={{ position: "absolute", left: "50%", top: 90, transform: "translateX(-50%)" }}>
            <div style={{
              position: "absolute",
              top: -18,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#ff3b30",
              color: "white",
              fontFamily: "monospace",
              fontSize: 8,
              borderRadius: 999,
              padding: "2px 6px",
              whiteSpace: "nowrap",
              animation: "pulse 1.5s ease-in-out infinite",
            }}>
              ● LIVE
            </div>
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
              alt=""
              aria-hidden="true"
              style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", display: "block", border: "2px solid #ff3b30" }}
            />
          </div>

          {/* Avatar 4 — bottom centre-left: spinning cyan arc */}
          <div style={{ position: "absolute", left: "25%", bottom: 10 }}>
            <div style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "#00e5ff",
              borderRightColor: "#00e5ff",
              animation: "arcSpin 3s linear infinite",
            }} />
            <img
              src="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150"
              alt=""
              aria-hidden="true"
              style={{ width: 68, height: 68, borderRadius: "50%", objectFit: "cover", display: "block" }}
            />
          </div>

        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, color: "white", lineHeight: 1.05, margin: "12px 0 0", letterSpacing: 1 }}>
          THE STAGE IS YOURS.
        </h1>

        {/* Subline */}
        <p style={{ fontFamily: "monospace", fontSize: 13, color: "#555", letterSpacing: 2, margin: "8px 0 0" }}>
          Live. Create. Earn.
        </p>

        {/* Form */}
        <div style={{ marginTop: 32, maxWidth: 340, margin: "32px auto 0" }}>
          {/* OAuth — coming soon */}

          {step === "email" ? (
            <form onSubmit={sendCode}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="rvlr-input"
                style={inputStyle}
              />
              <button type="submit" disabled={loading} style={ctaButtonStyle}>
                {loading ? "Sending…" : "Send code"}
              </button>

              {status === "sent" && (
                <p style={{ marginTop: 12, fontFamily: "monospace", fontSize: 13, color: "#00e5ff" }}>
                  Check your inbox — we&apos;ve sent you a code.
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={verifyCode}>
              <label style={labelStyle}>Code</label>
              <input
                inputMode="numeric"
                placeholder="12345678"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                disabled={loading}
                className="rvlr-input"
                style={inputStyle}
              />
              <button type="submit" disabled={loading} style={ctaButtonStyle}>
                {loading ? "Verifying…" : "Verify code"}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => { setStatus("idle"); setError(""); setCode(""); setStep("email"); }}
                style={{
                  display: "block",
                  margin: "12px auto 0",
                  background: "transparent",
                  border: "none",
                  color: "#444",
                  fontSize: 12,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  textDecoration: "none",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Use a different email
              </button>
            </form>
          )}

          {status === "error" && (
            <p style={{ marginTop: 12, fontSize: 13, color: "#ff3b30" }}>
              {error || "Something went wrong. Please try again."}
            </p>
          )}
        </div>

        {/* Explore first */}
        <div style={{ marginTop: 40 }}>
          <button
            type="button"
            onClick={() => router.push("/public-feed")}
            style={{
              background: "transparent",
              border: "none",
              color: "#333",
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: 2,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Explore first
          </button>
        </div>
      </div>
    </div>
  );
}

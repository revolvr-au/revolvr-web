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

    // SSR cookies now exist; go where you want
    window.location.href = redirectTo;
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
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "#060606",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .rvlr-input:focus {
          border-color: #00e5ff !important;
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 380,
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 32,
            letterSpacing: 8,
            color: "white",
          }}
        >
          REVOLVR
        </div>

        {/* Cyan arc decoration */}
        <div
          style={{
            width: 60,
            height: 14,
            borderTop: "2px solid #00e5ff",
            borderLeft: "2px solid #00e5ff",
            borderRight: "2px solid #00e5ff",
            borderRadius: "50% 50% 0 0",
            opacity: 0.4,
            margin: "10px auto 0",
          }}
        />

        {/* Headline */}
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 48,
            color: "white",
            letterSpacing: 1,
            margin: "20px 0 0",
            lineHeight: 1.05,
          }}
        >
          The platform that pays creators.
        </h1>

        {/* Subline */}
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 14,
            color: "#555",
            letterSpacing: 2,
            margin: "12px 0 0",
          }}
        >
          Watch, create, earn. Built in Australia.
        </p>

        {/* Form area */}
        <div style={{ marginTop: 40 }}>
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
                <p
                  style={{
                    marginTop: 12,
                    fontFamily: "monospace",
                    fontSize: 13,
                    color: "#00e5ff",
                  }}
                >
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
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
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
                onClick={() => {
                  setStatus("idle");
                  setError("");
                  setCode("");
                  setStep("email");
                }}
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

        {/* Explore first — very bottom */}
        <div style={{ marginTop: 48 }}>
          <button
            type="button"
            onClick={() => router.push("/public-feed")}
            style={{
              background: "transparent",
              border: "none",
              color: "#333",
              fontSize: 12,
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

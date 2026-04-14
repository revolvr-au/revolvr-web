"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const supabase = createSupabaseBrowserClient();

export default function CreatorOnboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectingStripe, setRedirectingStripe] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const continueParam = searchParams?.get("continue");

        if (continueParam === "stripe") {
          setRedirectingStripe(true);

          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;

          if (!token) {
            router.replace("/login?redirectTo=/creator/onboard?continue=stripe");
            return;
          }

          const stripeRes = await fetch("/api/stripe/connect/link", {

            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });

          const stripeJson = await stripeRes.json().catch(() => null);

          if (stripeRes.status === 409 && stripeJson?.redirectTo) {
            router.replace(String(stripeJson.redirectTo));
            return;
          }

          if (stripeRes.ok && stripeJson?.url) {
            window.location.href = String(stripeJson.url);
            return;
          }

          if (!cancelled) {
            setRedirectingStripe(false);
            setErr(stripeJson?.error || "Could not start Stripe onboarding.");
          }
          return;
        }

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;

        const res = await fetch("/api/creator/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);
        if (cancelled) return;

        if (json?.isCreator) {
          router.replace("/creator");
          return;
        }
      } catch {
        // allow render
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const onActivate = async () => {
    setErr(null);
    setLoading(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.replace("/login?redirectTo=/creator/onboard");
        return;
      }

      const res = await fetch("/api/creator/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ handle, displayName }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || "Server error");
        return;
      }

      setRedirectingStripe(true);

      const stripeRes = await fetch("/api/stripe/connect/link", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const stripeJson = await stripeRes.json().catch(() => null);

      if (stripeRes.status === 409 && stripeJson?.redirectTo) {
        router.replace(String(stripeJson.redirectTo));
        return;
      }

      if (!stripeRes.ok || !stripeJson?.url) {
        setRedirectingStripe(false);
        setErr(stripeJson?.error || "Stripe onboarding failed.");
        return;
      }

      window.location.href = String(stripeJson.url);
    } catch (e) {
      console.error("[creator/onboard] activate error", e);
      setErr("Server error");
      setRedirectingStripe(false);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = handle.trim().length > 0 && displayName.trim().length > 0 && !loading;

  if (redirectingStripe) {
    return (
      <div style={{
        minHeight: "100dvh",
        background: "#0a0806",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28,
          letterSpacing: 8,
          color: "white",
        }}>
          REVOLVR
        </div>
        <div style={{
          fontFamily: "monospace",
          fontSize: 13,
          color: "#00e5ff",
          letterSpacing: 2,
        }}>
          REDIRECTING TO STRIPE…
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#333" }}>
          Please wait.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0a0806",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
    }}>
      {/* Wordmark */}
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 28,
        letterSpacing: 8,
        color: "white",
        marginBottom: 32,
      }}>
        REVOLVR
      </div>

      <div style={{
        width: "100%",
        maxWidth: 380,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}>
        {/* Title */}
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 36,
          color: "white",
          textAlign: "center",
          lineHeight: 1,
        }}>
          BECOME A CREATOR
        </div>

        {/* Subline */}
        <div style={{
          fontFamily: "monospace",
          fontSize: 13,
          color: "#555",
          textAlign: "center",
        }}>
          Choose your handle and display name to enable payouts.
        </div>

        {/* Error */}
        {err && (
          <div style={{
            fontFamily: "monospace",
            fontSize: 12,
            color: "#ff3b30",
            textAlign: "center",
            width: "100%",
          }}>
            {err}
          </div>
        )}

        {/* Handle input */}
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="yourhandle"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#110e0b",
            border: "1px solid #2a2520",
            borderRadius: 50,
            padding: "13px 18px",
            fontFamily: "monospace",
            fontSize: 14,
            color: "white",
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#00e5ff")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2520")}
        />

        {/* Display name input */}
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#110e0b",
            border: "1px solid #2a2520",
            borderRadius: 50,
            padding: "13px 18px",
            fontFamily: "monospace",
            fontSize: 14,
            color: "white",
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#00e5ff")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2520")}
        />

        {/* Continue button */}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onActivate}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 50,
            background: "transparent",
            border: `1px solid ${canSubmit ? "#00e5ff" : "#2a2520"}`,
            color: canSubmit ? "#00e5ff" : "#333",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18,
            letterSpacing: 3,
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "border-color 0.2s, color 0.2s",
          }}
        >
          {loading ? "SAVING…" : "CONTINUE"}
        </button>
      </div>
    </div>
  );
}

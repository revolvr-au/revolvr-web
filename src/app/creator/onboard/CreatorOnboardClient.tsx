"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const supabase = createSupabaseBrowserClient();
const CHARACTERS = [1, 2, 3, 4, 5];

export default function CreatorOnboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [characterId, setCharacterId] = useState<number>(1);
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
    return () => { cancelled = true; };
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

      // Save character choice
      await fetch("/api/creator/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ characterId }),
      });

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

  const canSubmitStep1 = handle.trim().length > 0 && displayName.trim().length > 0;

  if (redirectingStripe) {
    return (
      <div style={{
        minHeight: "100dvh", background: "#0a0806",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        <div style={{ fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: 8, color: "white" }}>
          REVOLVR
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 13, color: "#ffffff", letterSpacing: 2 }}>
          REDIRECTING TO STRIPE…
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Please wait.</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh", background: "#0a0806",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 20px",
    }}>
      <div style={{ fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: 8, color: "white", marginBottom: 32 }}>
        REVOLVR
      </div>

      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>

        {/* ── STEP 1: Handle + display name ── */}
        {step === 1 && (
          <>
            <div style={{ fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700, fontSize: 36, color: "white", textAlign: "center", lineHeight: 1 }}>
              BECOME A CREATOR
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
              Choose your handle and display name to enable payouts.
            </div>

            {err && (
              <div style={{ fontFamily: "monospace", fontSize: 12, color: "#ff3b30", textAlign: "center", width: "100%" }}>
                {err}
              </div>
            )}

            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="yourhandle"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#110e0b", border: "1px solid #2a2520",
                borderRadius: 50, padding: "13px 18px",
                fontFamily: "monospace", fontSize: 14, color: "white", outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#ffffff")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2520")}
            />

            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#110e0b", border: "1px solid #2a2520",
                borderRadius: 50, padding: "13px 18px",
                fontFamily: "monospace", fontSize: 14, color: "white", outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#ffffff")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2520")}
            />

            <button
              type="button"
              disabled={!canSubmitStep1}
              onClick={() => setStep(2)}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 50,
                background: "transparent",
                border: `1px solid ${canSubmitStep1 ? "#ffffff" : "#2a2520"}`,
                color: canSubmitStep1 ? "#ffffff" : "rgba(255,255,255,0.6)",
                fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 3,
                cursor: canSubmitStep1 ? "pointer" : "not-allowed",
                transition: "border-color 0.2s, color 0.2s",
              }}
            >
              NEXT
            </button>
          </>
        )}

        {/* ── STEP 2: Character picker ── */}
        {step === 2 && (
          <>
            <div style={{ fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700, fontSize: 36, color: "white", textAlign: "center", lineHeight: 1 }}>
              PICK YOUR CHARACTER
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
              This character will appear on your live streams.
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
              gap: 10, width: "100%", marginTop: 8,
            }}>
              {CHARACTERS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCharacterId(id)}
                  style={{
                    background: characterId === id ? "rgba(255,255,255,0.08)" : "#110e0b",
                    border: `2px solid ${characterId === id ? "#ffffff" : "#2a2520"}`,
                    borderRadius: 12, padding: "6px 4px 0",
                    cursor: "pointer", display: "flex",
                    flexDirection: "column", alignItems: "center",
                    transition: "border-color 0.15s, background 0.15s",
                    overflow: "hidden",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/character_${id}.png`}
                    alt={`Character ${id}`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </button>
              ))}
            </div>

            {err && (
              <div style={{ fontFamily: "monospace", fontSize: 12, color: "#ff3b30", textAlign: "center", width: "100%" }}>
                {err}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 50,
                  background: "transparent", border: "1px solid #2a2520",
                  color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
                  fontSize: 18, letterSpacing: 3, cursor: "pointer",
                }}
              >
                BACK
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onActivate}
                style={{
                  flex: 2, padding: "14px 0", borderRadius: 50,
                  background: "transparent", border: "1px solid #ffffff",
                  color: "#ffffff", fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
                  fontSize: 18, letterSpacing: 3,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "border-color 0.2s, color 0.2s",
                }}
              >
                {loading ? "SAVING…" : "CONTINUE"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
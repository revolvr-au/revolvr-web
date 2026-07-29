"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

const POLL_MS = 1500;
const POLL_TIMEOUT_MS = 24000;

// "checking"  — payment taken, waiting on the async webhook to credit
// "credited"  — server confirms this session was fulfilled
// "lagging"   — still not credited after the timeout; don't claim it landed
// "balance"   — no session id in the URL, so just show the real balance
// "signedout" — can't read a balance without a session
type Status = "checking" | "credited" | "lagging" | "balance" | "signedout";

const FONT =
  "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id") ?? null;

  const [status, setStatus] = useState<Status>("checking");
  const [sparks, setSparks] = useState<number | null>(null);
  const [credited, setCredited] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  const recheck = useCallback(() => {
    setStatus("checking");
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const poll = async () => {
      try {
        const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
        const res = await fetch(`/api/spark/balance${qs}`, { cache: "no-store" });
        if (cancelled) return;

        if (res.status === 401) {
          setStatus("signedout");
          return;
        }

        const data = (await res.json().catch(() => ({}))) as {
          sparks?: unknown;
          fulfilled?: unknown;
          credited?: unknown;
        };
        if (cancelled) return;

        if (typeof data.sparks === "number") setSparks(data.sparks);
        if (typeof data.credited === "number") setCredited(data.credited);

        // Only claim the sparks landed once the server says the session was
        // fulfilled — the webhook is async and may not have run yet.
        if (data.fulfilled === true) {
          setStatus("credited");
          return;
        }

        // Nothing to wait for without a session id: report the real balance.
        if (!sessionId) {
          setStatus("balance");
          return;
        }
      } catch {
        // Network hiccup — fall through and retry until the timeout.
      }

      if (cancelled) return;
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setStatus("lagging");
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, attempt]);

  const headline =
    status === "credited"
      ? credited !== null
        ? `${credited.toLocaleString()} SPARKS LOADED`
        : "SPARKS LOADED"
      : status === "balance"
        ? "YOUR SPARKS"
        : status === "signedout"
          ? "PAYMENT RECEIVED"
          : status === "lagging"
            ? "PAYMENT RECEIVED"
            : "CONFIRMING…";

  const subline =
    status === "credited"
      ? "Your sparks are ready. Go gift a creator."
      : status === "balance"
        ? "Current balance."
        : status === "signedout"
          ? "Sign in to see your spark balance."
          : status === "lagging"
            ? "Your sparks are still landing — this can take a moment. Your balance will update on its own."
            : "Payment went through. Confirming your top-up…";

  return (
    <div style={{
      minHeight: "100dvh", background: "#0a0806",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 20px", textAlign: "center",
    }}>
      <div style={{
        fontSize: 56,
        marginBottom: 16,
        opacity: status === "credited" ? 1 : 0.55,
        transition: "opacity 0.3s",
      }}>⚡</div>

      <div
        aria-live="polite"
        style={{
          fontFamily: FONT, fontWeight: 700,
          fontSize: status === "checking" ? 32 : 42,
          letterSpacing: 3, color: "#ffffff", marginBottom: 8,
        }}
      >
        {headline}
      </div>

      <p style={{
        fontSize: 13, color: "rgba(255,255,255,0.6)",
        marginBottom: 24, maxWidth: 320, lineHeight: 1.6,
      }}>
        {subline}
      </p>

      {sparks !== null && (
        <div style={{
          fontFamily: "monospace", fontSize: 11, letterSpacing: 2,
          color: "rgba(255,255,255,0.5)", marginBottom: 32,
        }}>
          BALANCE {sparks.toLocaleString()} ⚡
        </div>
      )}

      <button
        onClick={() => router.push("/public-feed")}
        style={{
          background: "#ffffff", border: "none", borderRadius: 50,
          padding: "14px 40px", fontFamily: FONT, fontWeight: 700,
          fontSize: 18, letterSpacing: 3, color: "#0a0806", cursor: "pointer",
        }}
      >
        BACK TO FEED
      </button>

      {status === "lagging" && (
        <button
          onClick={recheck}
          style={{
            marginTop: 14, background: "transparent",
            border: "1px solid rgba(255,255,255,0.25)", borderRadius: 50,
            padding: "10px 26px", fontFamily: "monospace", fontSize: 10,
            letterSpacing: 2, color: "rgba(255,255,255,0.75)", cursor: "pointer",
          }}
        >
          CHECK AGAIN
        </button>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>;
}

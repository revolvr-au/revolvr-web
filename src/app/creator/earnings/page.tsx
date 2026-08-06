"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatCents(cents: number): string {
  return `AUD $${(cents / 100).toFixed(2)}`;
}

type Balance = {
  totalEarnedCents?: number | null;
  availableCents?: number | null;
} | null;

export default function CreatorEarningsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<Balance>(null);
  const [state, setState] = useState<"loading" | "ready" | "signedOut" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/creator/me", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        if (!data?.loggedIn) {
          setState("signedOut");
          return;
        }
        setBalance(data?.balance ?? null);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0806",
      color: "white",
      fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: 480,
      margin: "0 auto",
      padding: "24px 20px 60px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 48 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "4px 2px" }}
        >←</button>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
          Creator
        </div>
        <div style={{ width: 30 }} />
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
        fontSize: 52,
        letterSpacing: 2,
        color: "white",
        margin: "0 0 10px",
        lineHeight: 1,
      }}>
        Earnings Dashboard
      </h1>

      {/* Subtitle */}
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 36px", lineHeight: 1.6 }}>
        Your earnings overview.
      </p>

      <div style={{ borderTop: "1px solid #1a1510", marginBottom: 32 }} />

      {state === "loading" ? (
        <p style={{ fontSize: 13, color: "#888", margin: 0 }}>Loading…</p>
      ) : state === "signedOut" ? (
        <p style={{ fontSize: 13, color: "#888", margin: 0, lineHeight: 1.6 }}>
          Sign in to see your earnings.
        </p>
      ) : state === "error" ? (
        <p style={{ fontSize: 13, color: "#888", margin: 0, lineHeight: 1.6 }}>
          Couldn’t load your earnings. Try again shortly.
        </p>
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 8 }}>
              Total earned
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 0.5 }}>
              {formatCents(balance?.totalEarnedCents ?? 0)}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 8 }}>
              Available
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 0.5 }}>
              {formatCents(balance?.availableCents ?? 0)}
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#888", margin: 0, lineHeight: 1.6 }}>
            Withdrawals open soon.
          </p>
        </>
      )}
    </div>
  );
}

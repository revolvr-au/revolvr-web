"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Tier = "blue" | "gold" | null;

export default function VerificationCTA(props: { creatorEmail?: string }) {
  const params = useParams<{ email?: string }>();

  const creatorEmail = useMemo(() => {
    const raw = props.creatorEmail ?? params?.email ?? "";
    return String(raw || "").trim().toLowerCase();
  }, [props.creatorEmail, params]);

  const [tier, setTier] = useState<Tier>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      if (!creatorEmail) {
        setTier(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/creator/verified?emails=${encodeURIComponent(creatorEmail)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        const t = (data?.tiers?.[creatorEmail] ?? null) as Tier;
        if (!cancelled) setTier(t);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load verification status");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [creatorEmail]);

  async function startCheckout(nextTier: "blue" | "gold") {
    if (!creatorEmail) return;
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/payments/verification/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: nextTier, creatorEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Checkout failed");
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("No checkout URL returned");
    } catch (e: any) {
      setErr(e?.message ?? "Checkout failed");
      setBusy(false);
    }
  }

  // If already gold, no CTA needed.
  if (!creatorEmail) return null;
  if (!loading && tier === "gold") return null;

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-sm font-semibold">Verification</div>

      {loading ? (
        <div className="mt-1 text-xs text-white/60">Checking status…</div>
      ) : (
        <div className="mt-1 text-xs text-white/60">
          Current: <span className="text-white">{tier ?? "none"}</span>
        </div>
      )}

      {err ? <div className="mt-2 text-xs text-red-400">{err}</div> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {tier === "blue" ? (
          <button
            disabled={busy}
            onClick={() => startCheckout("gold")}
            className="rounded-lg bg-yellow-500/90 px-3 py-2 text-xs font-semibold text-black hover:bg-yellow-500 disabled:opacity-60"
          >
            Upgrade to Gold
          </button>
        ) : (
          <>
            <button
              disabled={busy}
              onClick={() => startCheckout("blue")}
              className="rounded-lg bg-blue-500/90 px-3 py-2 text-xs font-semibold text-black hover:bg-blue-500 disabled:opacity-60"
            >
              Buy Blue Tick
            </button>

            <button
              disabled={busy}
              onClick={() => startCheckout("gold")}
              className="rounded-lg bg-yellow-500/90 px-3 py-2 text-xs font-semibold text-black hover:bg-yellow-500 disabled:opacity-60"
            >
              Buy Gold Tick
            </button>
          </>
        )}
      </div>

      <div className="mt-2 text-[11px] text-white/50">
        You will be redirected to Stripe Checkout.
      </div>
    </div>
  );
}

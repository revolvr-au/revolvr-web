"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Status = {
  ok: boolean;
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted?: boolean;
  onboardingStatus?: string | null;
};

export default function StripeConnectCTA() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function fetchStatus() {
    setErr(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus(null);
      return;
    }

    const res = await fetch("/api/stripe/connect/status", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(json?.error || "Failed to load Stripe status");
      return;
    }
    setStatus(json as Status);
  }

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startOnboarding() {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch("/api/stripe/connect/create", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "Failed to start Stripe onboarding");
      }

      window.location.href = String(json.url);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to start onboarding");
    } finally {
      setLoading(false);
    }
  }

  const connected = Boolean(status?.connected);
  const ready = Boolean(status?.chargesEnabled && status?.payoutsEnabled);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold">Creator payouts</div>
      <div className="mt-1 text-[12px] text-white/60">
        {connected
          ? ready
            ? "Stripe connected (charges + payouts enabled)."
            : "Stripe connected, onboarding incomplete."
          : "Connect Stripe to receive tips and payouts."}
      </div>

      {err ? (
        <div className="mt-2 text-[12px] text-red-300">{err}</div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={startOnboarding}
          disabled={loading}
          className="rounded-lg bg-white/10 px-3 py-2 text-[12px] font-semibold hover:bg-white/15 disabled:opacity-60"
        >
          {loading ? "Opening Stripe..." : connected ? "Finish Stripe setup" : "Connect Stripe"}
        </button>

        <button
          type="button"
          onClick={fetchStatus}
          className="rounded-lg bg-white/5 px-3 py-2 text-[12px] hover:bg-white/10"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

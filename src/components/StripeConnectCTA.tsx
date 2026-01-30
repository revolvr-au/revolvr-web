"use client";

import { useEffect, useState } from "react";

type Status = {
  ok?: boolean;
  connected?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  onboardingStatus?: string | null;
  stripeAccountId?: string | null;
  error?: string;
};

export default function StripeConnectCTA() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/stripe/connect/status", { cache: "no-store" });

      // If not signed in, status endpoint returns 401
      if (res.status === 401) {
        setStatus(null);
        setMsg("Please sign in to connect Stripe.");
        return;
      }

      const data = (await res.json().catch(() => null)) as Status | null;

      if (!res.ok) {
        setStatus(null);
        setMsg(data?.error || "Unable to load Stripe status");
        return;
      }

      setStatus(data);
    } catch (e: any) {
      setStatus(null);
      setMsg(e?.message || "Unable to load Stripe status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
     
  }, []);

  async function startOnboarding() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/stripe/connect/link", {
        method: "POST",
        cache: "no-store",
      });

      if (res.status === 401) throw new Error("Please sign in to connect Stripe.");

      const data = await res.json().catch(() => null);
      const url = data?.url;
      if (!url) throw new Error(data?.error || "Missing onboarding URL");

      window.location.href = url;
    } catch (e: any) {
      setMsg(e?.message || "Unable to start onboarding");
    } finally {
      setLoading(false);
    }
  }

  async function manageBilling() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/payments/verification/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({}),
      });

      if (res.status === 401) throw new Error("Please sign in first.");

      const data = await res.json().catch(() => null);
      const url = data?.url;
      if (!url) throw new Error(data?.error || "Missing billing portal URL");

      window.location.href = url;
    } catch (e: any) {
      setMsg(e?.message || "Unable to open billing portal");
    } finally {
      setLoading(false);
    }
  }

  const connected = Boolean(status?.connected);
  const complete = Boolean(status?.chargesEnabled && status?.payoutsEnabled);

  const subtitle = status
    ? complete
      ? "Connected (charges + payouts enabled)"
      : connected
        ? "Connected (onboarding incomplete)"
        : "Not connected"
    : "Sign in to connect Stripe payouts.";

  const primaryLabel = complete
    ? "Manage"
    : connected
      ? "Continue setup"
      : "Connect Stripe";

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Stripe payouts</div>
          <div className="text-[11px] text-white/60">{subtitle}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
            disabled={loading}
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={complete ? manageBilling : startOnboarding}
            className="rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-black hover:bg-white disabled:opacity-60"
            disabled={loading}
          >
            {primaryLabel}
          </button>
        </div>
      </div>

      {msg ? <div className="mt-2 text-[11px] text-red-400">{msg}</div> : null}
    </div>
  );
}

"use client";

import { useState } from "react";

export default function ConnectStripeButton() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/stripe/connect/link", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create Stripe onboarding link");
      }

      if (!data?.url) throw new Error("No Stripe onboarding URL returned");

      window.location.href = data.url; // send user to Stripe onboarding
    } catch (e: any) {
      setErr(String(e?.message || e));
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={onClick}
        disabled={loading}
        className="rounded-lg px-4 py-2 bg-emerald-500 text-white disabled:opacity-60"
      >
        {loading ? "Opening Stripe..." : "Connect payouts (Stripe)"}
      </button>

      {err ? <p className="mt-2 text-sm text-red-500">{err}</p> : null}
    </div>
  );
}

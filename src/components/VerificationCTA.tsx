"use client";

import { useEffect, useState } from "react";

type MeResponse = {
  loggedIn: boolean;
  user?: { email?: string | null };
  creator?: { verificationTier?: "blue" | "gold" | null };
};

export default function VerificationCTA() {
  const [email, setEmail] = useState<string | null>(null);
  const [tier, setTier] = useState<"blue" | "gold" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/creator/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: MeResponse) => {
        if (data.loggedIn) {
          setEmail(data.user?.email?.toLowerCase() ?? null);
          setTier(data.creator?.verificationTier ?? null);
        }
      });
  }, []);

  async function startCheckout(t: "blue" | "gold") {
    if (!email) {
      setError("Please sign in to verify your account.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/verification/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: t,
          creatorEmail: email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Checkout failed");
      }

      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || "Unable to start checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold">Verification</div>
      <div className="text-[11px] text-white/60 mb-2">
        Current: {tier ?? "none"}
      </div>

      {error && <div className="mb-2 text-xs text-red-400">{error}</div>}

      <div className="flex gap-2">
        <button
          disabled={loading}
          onClick={() => startCheckout("blue")}
          className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-400 disabled:opacity-60"
        >
          Buy Blue Tick
        </button>

        <button
          disabled={loading}
          onClick={() => startCheckout("gold")}
          className="rounded-lg bg-yellow-500 px-3 py-2 text-xs font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
        >
          Buy Gold Tick
        </button>
      </div>

      <div className="mt-2 text-[11px] text-white/50">
        You will be redirected to Stripe Checkout.
      </div>
    </div>
  );
}

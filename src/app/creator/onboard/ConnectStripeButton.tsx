"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const supabase = createSupabaseBrowserClient();

export default function ConnectStripeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConnect = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setError("Not authenticated. Please sign in again.");
        return;
      }

      const res = await fetch("/api/stripe/connect/link", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error || "Could not start Stripe onboarding.");
        return;
      }

      if (json?.url) {
        window.location.href = json.url;
        return;
      }

      setError("Stripe onboarding link missing from response.");
    } catch (e) {
      console.error("[ConnectStripeButton] unexpected", e);
      setError("Could not start Stripe onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-400/20 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onConnect}
        disabled={loading}
        className="w-full rounded-xl bg-black text-white px-4 py-3 font-semibold disabled:opacity-60"
      >
        {loading ? "Connecting…" : "Connect Stripe"}
      </button>
    </div>
  );
}

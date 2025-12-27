"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const supabase = createSupabaseBrowserClient();

export default function ConnectStripeButton() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onConnect = async () => {
    setErr(null);
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch("/api/stripe/connect/link", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || "Could not start Stripe onboarding.");
        return;
      }

      const url = json?.url;
      if (typeof url === "string" && url.startsWith("http")) {
        window.location.href = url;
        return;
      }

      setErr("Stripe onboarding URL missing.");
    } catch (e) {
      console.error("[ConnectStripeButton] error", e);
      setErr("Could not start Stripe onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {err && (
        <div className="rounded-xl bg-red-500/10 border border-red-400/20 text-red-200 text-sm px-3 py-2">
          {err}
        </div>
      )}

      <button
        type="button"
        onClick={onConnect}
        disabled={loading}
        className="w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {loading ? "Opening Stripe…" : "Connect Stripe"}
      </button>
    </div>
  );
}

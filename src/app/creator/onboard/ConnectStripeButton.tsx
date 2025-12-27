"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/supabase-browser";

export default function ConnectStripeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setError("Please sign in again (session missing).");
        return;
      }

      const res = await fetch("/api/stripe/connect/link", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error || `Stripe link failed (${res.status})`);
        return;
      }

      const url = json?.url;
      if (!url) {
        setError("Stripe link missing from response.");
        return;
      }

      window.location.href = url;
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {loading ? "Opening Stripe…" : "Connect Stripe"}
      </button>
    </div>
  );
}

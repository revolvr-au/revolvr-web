"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export default function CreatorOnboardPage() {
  const router = useRouter();

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();

      const res = await fetch("/api/creator/me", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json().catch(() => ({}));

      if (!data.loggedIn) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      if (data.creator?.isActive) {
        router.replace("/creator/dashboard");
        return;
      }

      setLoading(false);
    })();
  }, [router]);

  async function startStripeOnboarding() {
    const token = await getAccessToken();

    const res = await fetch("/api/stripe/connect/link", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || "Could not start Stripe onboarding.");
    }
    if (!data?.url) throw new Error("No Stripe URL returned.");
    window.location.href = data.url;
  }

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        setError("Not authenticated");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/creator/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ handle, displayName }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not activate creator profile.");
        setSubmitting(false);
        return;
      }

      // After activation -> go to Stripe onboarding
      await startStripeOnboarding();
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white p-8">
        <h1 className="text-2xl font-semibold">Creator onboarding</h1>
        <p className="mt-2 text-white/70">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold">Become a Revolvr creator</h1>
      <p className="mt-2 text-white/70">
        Create your handle. You can connect payouts next.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 text-red-200 px-3 py-2">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-white/80">Handle</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="e.g. revolvr_au"
            className="mt-2 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm text-white/80">Display name (optional)</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Revolvr AU"
            className="mt-2 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 outline-none"
          />
        </label>

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-full bg-emerald-500 text-black font-medium py-2 disabled:opacity-60"
        >
          {submitting ? "Activating…" : "Activate creator"}
        </button>
      </div>
    </div>
  );
}

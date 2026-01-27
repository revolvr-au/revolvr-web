"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const supabase = createSupabaseBrowserClient();

export default function CreatorOnboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If we arrived here as "continue=stripe", immediately start Stripe (or bounce to Terms)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const continueParam = searchParams?.get("continue");
        if (continueParam !== "stripe") return;

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          router.replace("/login?redirectTo=/creator/onboard?continue=stripe");
          return;
        }

        const stripeRes = await fetch("/api/stripe/connect/create", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const stripeJson = await stripeRes.json().catch(() => null);

        // Gate: Terms required -> go to Terms, and return back here to continue Stripe
        if (stripeRes.status === 409 && stripeJson?.redirectTo) {
          router.replace(String(stripeJson.redirectTo));
          return;
        }

        // OK -> hard redirect to Stripe
        if (stripeRes.ok && stripeJson?.url) {
          window.location.href = String(stripeJson.url);
          return;
        }

        if (!cancelled) setErr(stripeJson?.error || "Could not start Stripe onboarding.");
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Could not start Stripe onboarding.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  // Submit onboarding form -> activate -> then start Stripe (or bounce to Terms)
  const onActivate = async () => {
    setErr(null);
    setLoading(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.replace("/login?redirectTo=/creator/onboard");
        return;
      }

      const res = await fetch("/api/creator/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          handle: handle.trim().toLowerCase(),
          displayName: displayName.trim(),
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(json?.error || "Server error");
        return;
      }

      const stripeRes = await fetch("/api/stripe/connect/create", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const stripeJson = await stripeRes.json().catch(() => null);

      if (stripeRes.status === 409 && stripeJson?.redirectTo) {
        router.replace(String(stripeJson.redirectTo));
        return;
      }

      if (!stripeRes.ok || !stripeJson?.url) {
        setErr(stripeJson?.error || "Stripe onboarding URL missing.");
        return;
      }

      window.location.href = String(stripeJson.url);
    } catch (e: any) {
      setErr(e?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold">Creator onboarding</h1>

      {err && (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-white/70">Display name</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm text-white/70">Handle</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="yourhandle"
            disabled={loading}
          />
        </div>

        <button
          type="button"
          onClick={onActivate}
          disabled={loading || !displayName.trim() || !handle.trim()}
          className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Working…" : "Activate & Connect Stripe"}
        </button>
      </div>
    </div>
  );
}

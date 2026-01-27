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
  const [redirectingStripe, setRedirectingStripe] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If we arrived here specifically to continue to Stripe, do NOT render the form.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const continueParam = searchParams?.get("continue");

        if (continueParam === "stripe") {
          setRedirectingStripe(true);

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

          if (stripeRes.status === 409 && stripeJson?.redirectTo) {
            router.replace(String(stripeJson.redirectTo));
            return;
          }

          if (stripeRes.ok && stripeJson?.url) {
            window.location.href = String(stripeJson.url);
            return;
          }

          // If we couldn't redirect for some reason, fall back to showing the form with an error.
          if (!cancelled) {
            setRedirectingStripe(false);
            setErr(stripeJson?.error || "Could not start Stripe onboarding.");
          }
          return;
        }

        // Normal behavior: if already a creator, skip onboarding
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;

        const res = await fetch("/api/creator/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);
        if (cancelled) return;

        if (json?.isCreator) {
          router.replace("/creator");
          return;
        }
      } catch {
        // allow render
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

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
        body: JSON.stringify({ handle, displayName }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || "Server error");
        return;
      }

      // After activation, go to Stripe (API will 409->terms if required)
      setRedirectingStripe(true);

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
        setRedirectingStripe(false);
        setErr(stripeJson?.error || "Stripe onboarding failed.");
        return;
      }

      window.location.href = String(stripeJson.url);
    } catch (e) {
      console.error("[creator/onboard] activate error", e);
      setErr("Server error");
      setRedirectingStripe(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ This removes the “glitch”: no onboard UI renders while redirecting.
  if (redirectingStripe) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-2xl font-semibold">Redirecting to Stripe…</h1>
        <p className="mt-2 text-sm text-white/70">Please wait.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold">Creator onboarding</h1>
      <p className="mt-2 text-sm text-white/70">
        Choose your creator handle and display name to enable payouts.
      </p>

      {err && (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <label className="block text-sm text-white/80">Handle</label>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
          placeholder="yourhandle"
        />

        <label className="block text-sm text-white/80">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
          placeholder="Your Name"
        />

        <button
          type="button"
          disabled={loading}
          onClick={onActivate}
          className="mt-2 w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const supabase = createSupabaseBrowserClient();

export default function CreatorOnboardPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Guard: if already a creator, skip onboarding
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

  const continueParam = Array.isArray(searchParams?.continue)
    ? searchParams?.continue[0]
    : searchParams?.continue;

  if (continueParam === "stripe") {
    const stripeRes = await fetch("/api/stripe/connect/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const stripeJson = await stripeRes.json().catch(() => null);

    if (stripeRes.status === 409 && stripeJson?.redirectTo) {
      redirect(String(stripeJson.redirectTo));
    }

    if (stripeRes.ok && stripeJson?.url) {
      redirect(String(stripeJson.url));
    }
  }


        if (!token) {
          router.replace("/login");
          return;
        }

        const res = await fetch("/api/creator/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);
        if (cancelled) return;

        if (json?.isCreator) {
          router.replace("/creator");
        }
      } catch {
        // allow render
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onActivate = async () => {
    setErr(null);
    setLoading(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

  const continueParam = Array.isArray(searchParams?.continue)
    ? searchParams?.continue[0]
    : searchParams?.continue;

  if (continueParam === "stripe") {
    const stripeRes = await fetch("/api/stripe/connect/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const stripeJson = await stripeRes.json().catch(() => null);

    if (stripeRes.status === 409 && stripeJson?.redirectTo) {
      redirect(String(stripeJson.redirectTo));
    }

    if (stripeRes.ok && stripeJson?.url) {
      redirect(String(stripeJson.url));
    }
  }


      if (!token) {
        setErr("unauthenticated");
        return;
      }

      const res = await fetch("/api/creator/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          handle: handle.trim(),
          displayName: displayName.trim(),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || "Server error");
        return;
      }

      // Immediately send creator to Stripe Connect
      const stripeRes = await fetch("/api/stripe/connect/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const stripeJson = await stripeRes.json().catch(() => null);


      if (stripeRes.status === 409 && stripeJson?.error === "terms_required" && stripeJson?.redirectTo) {
        window.location.href = String(stripeJson.redirectTo);
        return;
      }

      if (!stripeRes.ok || !stripeJson?.url) {
        setErr("Creator activated, but Stripe onboarding failed.");
        return;
      }

      // HARD redirect (required by Stripe)
      window.location.href = stripeJson.url;
    } catch (e) {
      console.error("[creator/onboard] activate error", e);
      setErr("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold">Creator onboarding</h1>
      <p className="mt-2 text-sm text-white/70">
        Set your creator handle to activate your creator account.
      </p>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Handle</label>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none"
            placeholder="your-handle"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Display name (optional)</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none"
            placeholder="Your name"
          />
        </div>

        {err && (
          <pre className="text-xs rounded-xl bg-red-500/10 border border-red-400/20 text-red-200 px-3 py-2 whitespace-pre-wrap">
            {JSON.stringify({ error: err })}
          </pre>
        )}

        <button
          type="button"
          onClick={onActivate}
          disabled={loading}
          className="w-full rounded-xl bg-black text-white px-4 py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "Activating…" : "Activate creator"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 font-semibold"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}

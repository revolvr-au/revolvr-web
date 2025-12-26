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

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/creator/me", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);

      if (!me?.loggedIn) {
        setError("No session token. You are not signed in.");
        setLoading(false);
        return;
      }

      if (me?.creator?.isActive) {
        router.replace("/creator/dashboard");
        return;
      }

      setLoading(false);
    })();
  }, [router]);

  async function submit() {
    setSubmitting(true);
    setError(null);

    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (!token) {
      setError("No session token. You are not signed in.");
      setSubmitting(false);
      router.push("/login?redirectTo=/creator/onboard");
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

    const data2 = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data2?.error ?? "Could not activate creator profile.");
      setSubmitting(false);
      return;
    }

    router.replace("/creator/dashboard");
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
      <p className="mt-2 text-white/70">Create your handle. You can connect payouts next.</p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 text-red-200 px-3 py-2">
          {error}
          <div className="mt-2 text-sm">
            <a className="underline" href="/login?redirectTo=/creator/onboard">
              Go to login
            </a>
          </div>
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import Link from "next/link";
import { useSearchParams } from "next/navigation";


const supabase = createSupabaseBrowserClient();

const TERMS_VERSION = "v1.0-2026-01-27";

export default function CreatorTermsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
const searchParams = useSearchParams();
const next = searchParams?.get("next") ?? "/me?terms=accepted";


  // Optional: if already accepted, let them continue
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          router.replace("/login");
          return;
        }

        // relies on your existing endpoint
        const res = await fetch("/api/creator/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

      if (json?.redirectTo) {
        window.location.href = String(json.redirectTo);
        return;
      }
        if (cancelled) return;

        // If your /api/creator/me doesn't return these yet, no problem.
        // We'll still allow acceptance.
        if (json?.creator?.creatorTermsAccepted) {
          router.replace(next);
          return;
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, next]);

  async function accept() {
    setError(null);
    setSaving(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/creator/terms/accept", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || "Could not record acceptance.");
        return;
      }

      router.replace(next);
    } catch (e: any) {
      setError(e?.message || "Could not record acceptance.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <a href="/feed" className="text-sm text-white/70 hover:text-white">
          ← Back to feed
        </a>
        <div className="text-sm text-white/60">Creator Terms</div>
        <div className="w-[92px]" />
      </div>

      <h1 className="mt-8 text-3xl font-semibold">Revolvr Creator Terms</h1>
      <p className="mt-2 text-sm text-white/60">
        Version {TERMS_VERSION} · Last updated 27 January 2026
      </p>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/85 relative">
        
        <button
          type="button"
          aria-label="Close"
          onClick={() => router.replace(next)}
          className="absolute right-4 top-4 h-10 w-10 rounded-xl border border-white/10 bg-black/40 text-white/80 hover:bg-white/10 flex items-center justify-center"
        >
          <span className="text-xl leading-none">×</span>
        </button>
<section className="space-y-2">
          <h2 className="text-base font-semibold">1. Eligibility</h2>
          <ul className="list-disc pl-5 space-y-1 text-white/75">
            <li>Revolvr is available to users aged 13 and over.</li>
            <li>To receive payouts, you must complete Stripe Connect onboarding and verification.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. Monetisation & Earnings</h2>
          <div className="text-white/75">
            Eligible monetisation actions:
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="font-semibold text-white/85">Main Feed</div>
                <div className="mt-1 text-white/70">React · Highlight · Pulse · Bloom · Signal</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="font-semibold text-white/85">Live Broadcast</div>
                <div className="mt-1 text-white/70">React · Highlight · Pulse</div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. Revenue Share</h2>
          <p className="text-white/75">
            You receive <span className="font-semibold text-white">45%</span> of eligible monetisation revenue. Stripe fees and
            payout fees are deducted from your share.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">4. Payout Timing & Clearance</h2>
          <ul className="list-disc pl-5 space-y-1 text-white/75">
            <li>7-day clearing period applies to earnings.</li>
            <li>Only cleared funds are eligible for payout.</li>
            <li>Cleared earnings are paid out daily (subject to Stripe and banks).</li>
            <li>Revolvr does not advance funds and is not a bank.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">5. Prohibited Content</h2>
          <p className="text-white/75">
            Adult content is prohibited. No pornographic images or videos. Monetisation of prohibited content may result in loss
            of earnings and suspension.
          </p>
        </section>

        <section className="space-y-3 pt-2 border-t border-white/10">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={saving || loading}
            />
            <span className="text-white/80">
              I have read and agree to the Revolvr Creator Terms (Version {TERMS_VERSION}).
            </span>
          </label>

          <button
            type="button"
            disabled={!checked || saving || loading}
            onClick={accept}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Agree & Continue"}
          </button>
        </section>
      </div>
    </div>
  );
}

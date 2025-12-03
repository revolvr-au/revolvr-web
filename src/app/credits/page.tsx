"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type Mode = "tip-pack" | "boost-pack" | "spin-pack";

const TIP_PACK_PRICE_CENTS = 2000;   // A$20 for 10 tips (example)
const BOOST_PACK_PRICE_CENTS = 2500; // A$25 for 5 boosts (example)
const SPIN_PACK_PRICE_CENTS = 1000;  // A$10 for 20 spins (example)

export default function CreditsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load current user; if not logged in, send to login then back here
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoadingUser(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
          router.replace("/login?redirectTo=/credits");
          return;
        }

        setUserEmail(user.email);
      } catch (e) {
        console.error("[CreditsPage] error loading user", e);
        setError("Revolvr glitched out checking your session 😵‍💫");
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, [router]);

  const startPackCheckout = async (mode: Mode) => {
    if (!userEmail) {
      router.push("/login?redirectTo=/credits");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      let amountCents: number;

      if (mode === "tip-pack") amountCents = TIP_PACK_PRICE_CENTS;
      else if (mode === "boost-pack") amountCents = BOOST_PACK_PRICE_CENTS;
      else amountCents = SPIN_PACK_PRICE_CENTS;

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          userEmail,
          amountCents,
          postId: null,
        }),
      });

      if (!res.ok) {
        console.error("Pack checkout failed", await res.text());
        setError("Revolvr glitched out starting checkout 😵‍💫 Try again.");
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Stripe did not return a checkout URL.");
      }
    } catch (e) {
      console.error("Error starting pack checkout", e);
      setError("Revolvr glitched out talking to Stripe 😵‍💫");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <main className="min-h-screen bg-[#050814] text-white flex items-center justify-center">
        <p className="text-sm text-white/70">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050814] text-white flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-lg">Revolvr credits</span>
            <span>🔥</span>
          </div>
          <p className="text-xs text-white/60">
            Stock up on tips, boosts and spins. Payments are handled by Stripe.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 text-red-200 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {/* Packs */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => startPackCheckout("tip-pack")}
            disabled={isSubmitting}
            className="w-full text-left rounded-2xl border border-emerald-400/30 bg-emerald-500/5 hover:bg-emerald-500/10 px-4 py-3 transition disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Tip pack</div>
                <div className="text-xs text-white/60">
                  10 creator tips · pay once, tip as you go
                </div>
              </div>
              <div className="text-sm font-semibold">A$20</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => startPackCheckout("boost-pack")}
            disabled={isSubmitting}
            className="w-full text-left rounded-2xl border border-indigo-400/40 bg-indigo-500/5 hover:bg-indigo-500/10 px-4 py-3 transition disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Boost pack</div>
                <div className="text-xs text-white/60">
                  5 post boosts · keep your favourites at the top
                </div>
              </div>
              <div className="text-sm font-semibold">A$25</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => startPackCheckout("spin-pack")}
            disabled={isSubmitting}
            className="w-full text-left rounded-2xl border border-pink-400/40 bg-pink-500/5 hover:bg-pink-500/10 px-4 py-3 transition disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Spin pack</div>
                <div className="text-xs text-white/60">
                  20 Revolvr spins · more chaos, less friction
                </div>
              </div>
              <div className="text-sm font-semibold">A$10</div>
            </div>
          </button>
        </div>

        <p className="mt-4 text-[11px] text-white/40 text-center">
          After payment, credits are added to your Revolvr account automatically.
        </p>
      </div>
    </main>
  );
}

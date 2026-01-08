// src/app/credits/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import { startCheckout } from "@/lib/purchase";

type PackMode = "tip-pack" | "boost-pack" | "spin-pack";

export default function CreditsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) setUserEmail(user?.email ?? null);
      } catch (e) {
        console.error("[credits] loadUser error", e);
      }
    };

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureLoggedIn = () => {
    if (!userEmail) {
      router.push("/login?redirectTo=/credits");
      return false;
    }
    return true;
  };

  const startPackCheckout = async (mode: PackMode) => {
    if (!ensureLoggedIn()) return;

    const email = userEmail;
    if (!email) return;

    try {
      setIsLoading(true);
      setError(null);

      await startCheckout({
        mode,
        creatorEmail: email, // pack credits belong to purchaser
        userEmail: email,
        source: "FEED",
        targetId: null,
        returnPath: "/credits",
      });
    } catch (e) {
      console.error("[credits] startPackCheckout error", e);
      setError("Revolvr glitched out talking to Stripe.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col">
      <header className="h-4 sm:h-6" />

      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-xl px-4 py-6 space-y-4">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-white/90">Buy Revolvr credits</h1>
            <p className="text-xs sm:text-sm text-white/60 mt-1">
              Grab packs of tips, boosts or spins so you don’t have to check out every single time.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 text-red-200 text-sm px-3 py-2 flex justify-between items-center shadow-sm shadow-red-500/20">
              <span>{error}</span>
              <button className="text-xs underline" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => startPackCheckout("tip-pack")}
              className="rounded-2xl border border-emerald-400/50 bg-emerald-500/5 hover:bg-emerald-500/15 px-4 py-3 text-left text-xs sm:text-sm transition disabled:opacity-60"
            >
              <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Tip pack</div>
              <div className="mt-1 text-lg font-semibold">A$20</div>
              <div className="mt-1 text-[11px] text-emerald-100/80">10× A$2 creator tips</div>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => startPackCheckout("boost-pack")}
              className="rounded-2xl border border-indigo-400/60 bg-indigo-500/5 hover:bg-indigo-500/15 px-4 py-3 text-left text-xs sm:text-sm transition disabled:opacity-60"
            >
              <div className="text-[11px] uppercase tracking-wide text-indigo-300/80">Boost pack</div>
              <div className="mt-1 text-lg font-semibold">A$50</div>
              <div className="mt-1 text-[11px] text-indigo-100/80">10× A$5 post boosts</div>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => startPackCheckout("spin-pack")}
              className="rounded-2xl border border-pink-400/60 bg-pink-500/5 hover:bg-pink-500/15 px-4 py-3 text-left text-xs sm:text-sm transition disabled:opacity-60"
            >
              <div className="text-[11px] uppercase tracking-wide text-pink-300/80">Spin pack</div>
              <div className="mt-1 text-lg font-semibold">A$20</div>
              <div className="mt-1 text-[11px] text-pink-100/80">20× A$1 Revolvr spins</div>
            </button>
          </div>

          <p className="text-[11px] text-white/35 mt-2">
            You’re in test mode right now – use Stripe test cards until we’re ready for launch.
          </p>
        </div>
      </main>
    </div>
  );
}

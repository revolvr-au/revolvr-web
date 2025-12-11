"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import {
  CreditBalances,
  loadCreditsForUser,
  spendOneCredit,
  PurchaseMode,
} from "@/lib/credits";

type PendingPurchase = {
  mode: PurchaseMode;
};

export default function LiveRoomPage() {
  const params = useParams<{ room: string }>();
  const router = useRouter();

  // Handle possible string | string[]
  const rawRoom = params?.room ?? "";
  const safeRoom =
    typeof rawRoom === "string" ? rawRoom : rawRoom[0] ?? "";

  const roomName = useMemo(
    () => decodeURIComponent(safeRoom),
    [safeRoom]
  );

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [credits, setCredits] = useState<CreditBalances | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const [pendingPurchase, setPendingPurchase] =
    useState<PendingPurchase | null>(null);

  // Load logged-in user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserEmail(user?.email ?? null);
      } catch (err) {
        console.error("[live] error loading user", err);
        setUserEmail(null);
      }
    };

    loadUser();
  }, []);

  // Load credits whenever we have a user
  useEffect(() => {
    if (!userEmail) {
      setCredits(null);
      return;
    }

    const loadCredits = async () => {
      try {
        setCreditsLoading(true);
        const balances = await loadCreditsForUser(userEmail);
        setCredits(balances);
      } catch (err) {
        console.error("[live] error loading credits", err);
        // Non-fatal: user can still pay via Stripe
      } finally {
        setCreditsLoading(false);
      }
    };

    loadCredits();
  }, [userEmail]);

  const ensureLoggedIn = () => {
    if (!userEmail) {
      const redirect = encodeURIComponent(`/live/${encodeURIComponent(roomName)}`);
      router.push(`/login?redirectTo=${redirect}`);
      return false;
    }
    return true;
  };

  /**
   * Core checkout starter – only used when user has no credits left
   * or spending a credit fails.
   */
  const startPayment = async (mode: PurchaseMode, kind: "single" | "pack") => {
    if (!ensureLoggedIn() || !userEmail) return;

    try {
      setError(null);

      const checkoutMode =
        kind === "pack"
          ? (`${mode}-pack` as "tip-pack" | "boost-pack" | "spin-pack")
          : mode;

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: checkoutMode,
          userEmail,
          postId: null, // live support is tied to the stream, not a feed post
          source: "live",
          returnPath: `/live/${encodeURIComponent(roomName)}`,
        }),
      });

      if (!res.ok) {
        console.error("[live] checkout failed:", await res.text());
        setError("Revolvr glitched out starting checkout 😵‍💫 Try again.");
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Stripe did not return a checkout URL.");
      }
    } catch (err) {
      console.error("[live] error starting payment", err);
      setError("Revolvr glitched out talking to Stripe 😵‍💫");
    }
  };

  /**
   * When user taps Tip/Boost/Spin:
   *  1) If they have a credit, spend it immediately.
   *  2) If not, open the single vs pack sheet (Stripe).
   */
  const handleSupportClick = async (mode: PurchaseMode) => {
    if (!ensureLoggedIn() || !userEmail) return;

    const available =
      mode === "tip"
        ? credits?.tip ?? 0
        : mode === "boost"
        ? credits?.boost ?? 0
        : credits?.spin ?? 0;

    if (available > 0) {
      try {
        const updated = await spendOneCredit(userEmail, mode);
        setCredits(updated);

        // TODO: trigger live overlay / animations here.
        return;
      } catch (err) {
        console.error(
          "[live] spend credit failed, falling back to checkout",
          err
        );
        // fall through to checkout sheet
      }
    }

    // No credits, or spending failed: show purchase choice sheet
    setPendingPurchase({ mode });
  };

  const handleSingleFromSheet = async () => {
    if (!pendingPurchase) return;
    await startPayment(pendingPurchase.mode, "single");
    setPendingPurchase(null);
  };

  const handlePackFromSheet = async () => {
    if (!pendingPurchase) return;
    await startPayment(pendingPurchase.mode, "pack");
    setPendingPurchase(null);
  };

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col">
      <main className="flex-1 flex flex-col items-center px-4 py-4">
        {/* Error banner */}
        {error && (
          <div className="w-full max-w-xl mb-3 rounded-xl bg-red-500/10 text-red-200 text-sm px-3 py-2 flex justify-between items-center shadow-sm shadow-red-500/20">
            <span>{error}</span>
            <button
              className="text-xs underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header */}
        <header className="w-full max-w-xl mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Live on Revolvr
            </h1>
            <p className="text-xs text-white/50 mt-1">
              Room:{" "}
              <span className="font-mono text-white/80">{roomName}</span>
            </p>
            {credits && (
              <p className="mt-1 text-[11px] text-white/55">
                Credits: {credits.tip} tips · {credits.boost} boosts ·{" "}
                {credits.spin} spins{" "}
                {creditsLoading && <span className="opacity-70">(updating…)</span>}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push("/public-feed")}
            className="text-xs px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10"
          >
            Back to feed
          </button>
        </header>

        {/* Live player placeholder – swap this out with your real player */}
        <section className="w-full max-w-xl rounded-2xl bg-black/40 border border-white/10 aspect-video mb-4 flex items-center justify-center text-white/60 text-xs sm:text-sm">
          Live broadcast goes here
        </section>

        {/* Support section */}
        <section className="w-full max-w-xl rounded-2xl bg-[#070b1b] border border-white/10 p-4 shadow-md shadow-black/40 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-semibold">
              Support this stream
            </h2>
            {userEmail && (
              <span className="text-[11px] text-white/45 truncate max-w-[160px] text-right">
                Signed in as {userEmail}
              </span>
            )}
          </div>

          <p className="text-xs text-white/60">
            Throw tips, boosts, or spins at the creator. We’ll use your
            existing credits first, then you can grab more with a quick
            checkout.
          </p>

          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
            <button
              type="button"
              onClick={() => handleSupportClick("tip")}
              className="rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/60 px-3 py-2 text-left transition"
            >
              <div className="font-semibold">Tip</div>
              <div className="text-emerald-200/80 mt-0.5">
                From A$2 • quick kudos
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSupportClick("boost")}
              className="rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/60 px-3 py-2 text-left transition"
            >
              <div className="font-semibold">Boost</div>
              <div className="text-indigo-200/80 mt-0.5">
                From A$5 • push the stream
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSupportClick("spin")}
              className="rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-400/60 px-3 py-2 text-left transition"
            >
              <div className="font-semibold">Spin</div>
              <div className="text-pink-200/80 mt-0.5">
                From A$1 • fun chaos
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* Bottom sheet: single vs pack choice */}
      {pendingPurchase && (
        <LivePurchaseChoiceSheet
          mode={pendingPurchase.mode}
          onClose={() => setPendingPurchase(null)}
          onSingle={handleSingleFromSheet}
          onPack={handlePackFromSheet}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live purchase choice sheet                                         */
/* ------------------------------------------------------------------ */

type LivePurchaseChoiceSheetProps = {
  mode: PurchaseMode;
  onClose: () => void;
  onSingle: () => void;
  onPack: () => void;
};

function LivePurchaseChoiceSheet({
  mode,
  onClose,
  onSingle,
  onPack,
}: LivePurchaseChoiceSheetProps) {
  const modeLabel =
    mode === "tip" ? "Tip" : mode === "boost" ? "Boost" : "Spin";

  const singleAmount =
    mode === "tip" ? "A$2" : mode === "boost" ? "A$5" : "A$1";

  const packAmount =
    mode === "tip" ? "A$20" : mode === "boost" ? "A$50" : "A$20";

  const packLabel =
    mode === "tip"
      ? "tip pack"
      : mode === "boost"
      ? "boost pack"
      : "spin pack";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm mb-6 mx-4 rounded-2xl bg-[#070b1b] border border-white/10 p-4 space-y-3 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Support this stream with a {modeLabel}
          </h2>
          <button
            onClick={onClose}
            className="text-xs text-white/50 hover:text-white"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-white/60">
          Choose a one-off {modeLabel.toLowerCase()} or grab a {packLabel} so
          you don&apos;t have to check out every time.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={onSingle}
            className="flex-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/60 px-3 py-2 text-xs text-left"
          >
            <div className="font-semibold">
              Single {modeLabel} ({singleAmount})
            </div>
            <div className="text-[11px] text-emerald-200/80">
              Quick one-off support
            </div>
          </button>

          <button
            type="button"
            onClick={onPack}
            className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 px-3 py-2 text-xs text-left"
          >
            <div className="font-semibold">
              Buy {packLabel} ({packAmount})
            </div>
            <div className="text-[11px] text-white/70">
              Better value, more {modeLabel.toLowerCase()}s
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-[11px] text-white/45 hover:text-white/70 mt-1"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

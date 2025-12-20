// src/app/live/[room]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import {
  CreditBalances,
  loadCreditsForUser,
  spendOneCredit,
  PurchaseMode,
} from "@/lib/credits";

type PendingPurchase = { mode: PurchaseMode };

export default function LiveRoomPage() {
  const params = useParams<{ room: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const safeRoom = params?.room ?? "";
  const roomName = useMemo(() => decodeURIComponent(safeRoom), [safeRoom]);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [credits, setCredits] = useState<CreditBalances | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(
    null
  );

  const [supportBusy, setSupportBusy] = useState(false);

  /* ---------------------- Load logged-in user ---------------------- */
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

  /* ---------------------- Load credits for user -------------------- */
  useEffect(() => {
    if (!userEmail) {
      setCredits(null);
      return;
    }

    const fetchCredits = async () => {
      try {
        setCreditsLoading(true);
        const balances = await loadCreditsForUser(userEmail);
        setCredits(balances);
      } catch (err) {
        console.error("[live] error loading credits", err);
        // Non-fatal: we just fall back to Stripe checkout.
        setCredits({ tip: 0, boost: 0, spin: 0 });
      } finally {
        setCreditsLoading(false);
      }
    };

    fetchCredits();
  }, [userEmail, searchParams?.toString()]);

  /* ---------------------- Auth helper ------------------------------ */
  const ensureLoggedIn = () => {
    if (!userEmail) {
      const redirect = encodeURIComponent(
        `/live/${encodeURIComponent(roomName)}`
      );
      router.push(`/login?redirectTo=${redirect}`);
      return false;
    }
    return true;
  };

  /* ---------------------- Stripe checkout -------------------------- */
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
          postId: roomName, // ok for now
          returnPath: `/live/${encodeURIComponent(roomName)}`,
        }),
      });

      if (!res.ok) {
        console.error("[live] checkout failed:", await res.text());
        setError("Revolvr glitched out starting checkout. Try again.");
        return;
      }

      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError("Stripe did not return a checkout URL.");
    } catch (err) {
      console.error("[live] error starting payment", err);
      setError("Revolvr glitched out talking to Stripe.");
    }
  };

  /* ---------------------- Spend / support logic -------------------- */
  const handleSupportClick = async (mode: PurchaseMode) => {
    if (!ensureLoggedIn() || !userEmail || supportBusy) return;

    setSupportBusy(true);
    try {
      setError(null);

      const available =
        mode === "tip"
          ? credits?.tip ?? 0
          : mode === "boost"
          ? credits?.boost ?? 0
          : credits?.spin ?? 0;

      // Spend if we have credits
      if (available > 0) {
        const updated = await spendOneCredit(userEmail, mode);
        setCredits(updated);
        // TODO: trigger live overlay animation here
        return;
      }

      // Otherwise purchase
      setPendingPurchase({ mode });
    } catch (err) {
      console.error("[live] support error", err);
      setError("Could not apply support. Try again.");
    } finally {
      setSupportBusy(false);
    }
  };

  const handleSingle = async (mode: PurchaseMode) => {
    await startPayment(mode, "single");
    setPendingPurchase(null);
  };

  const handlePack = async (mode: PurchaseMode) => {
    await startPayment(mode, "pack");
    setPendingPurchase(null);
  };

  /* ---------------------- UI helpers ------------------------------- */
  const creditsSummary = useMemo(() => {
    if (!credits) return null;
    const total = (credits.tip ?? 0) + (credits.boost ?? 0) + (credits.spin ?? 0);
    if (total <= 0) return null;

    const parts: string[] = [];
    if (credits.tip > 0) parts.push(`${credits.tip} tip${credits.tip === 1 ? "" : "s"}`);
    if (credits.boost > 0) parts.push(`${credits.boost} boost${credits.boost === 1 ? "" : "s"}`);
    if (credits.spin > 0) parts.push(`${credits.spin} spin${credits.spin === 1 ? "" : "s"}`);
    return parts.join(" • ");
  }, [credits]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col">
      <main className="flex-1 flex flex-col items-center px-4 py-4 pb-24">
        {error && (
          <div className="w-full max-w-xl mb-3 rounded-xl bg-red-500/10 text-red-200 text-sm px-3 py-2 flex justify-between items-center shadow-sm shadow-red-500/20">
            <span>{error}</span>
            <button className="text-xs underline" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <header className="w-full max-w-xl mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Live on Revolvr
            </h1>
            <p className="text-xs text-white/50 mt-1">
              Room: <span className="font-mono text-white/80">{roomName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/public-feed")}
            className="text-xs px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10"
          >
            Back to feed
          </button>
        </header>

        <section className="w-full max-w-xl rounded-2xl bg-black/40 border border-white/10 aspect-video mb-4 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-semibold text-white/80">
              Stream starting soon
            </div>
            <div className="text-[11px] text-white/50 mt-1">
              The creator is getting ready
            </div>
          </div>
        </section>

        <section className="w-full max-w-xl rounded-2xl bg-[#070b1b] border border-white/10 p-4 shadow-md shadow-black/40 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-semibold">Support this stream</h2>
            {userEmail && (
              <span className="text-[11px] text-white/45 truncate max-w-[160px] text-right">
                Signed in as {userEmail}
              </span>
            )}
          </div>

          <p className="text-xs text-white/60">
            Use your credits first. If you run out, you’ll be taken straight to Stripe to top up.
          </p>

          <p className="text-[11px] text-white/55 mt-1">
            {creditsLoading
              ? "Checking your credits…"
              : creditsSummary
              ? `Credits available: ${creditsSummary}.`
              : "No credits yet – your first support will open a quick checkout."}
          </p>

          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
            <button
              type="button"
              disabled={supportBusy}
              onClick={() => handleSupportClick("tip")}
              className="rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/60 px-3 py-2 text-left transition disabled:opacity-60"
            >
              <div className="font-semibold">Tip</div>
              <div className="text-emerald-200/80 mt-0.5">From A$2</div>
            </button>

            <button
              type="button"
              disabled={supportBusy}
              onClick={() => handleSupportClick("boost")}
              className="rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/60 px-3 py-2 text-left transition disabled:opacity-60"
            >
              <div className="font-semibold">Boost</div>
              <div className="text-indigo-200/80 mt-0.5">From A$5</div>
            </button>

            <button
              type="button"
              disabled={supportBusy}
              onClick={() => handleSupportClick("spin")}
              className="rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-400/60 px-3 py-2 text-left transition disabled:opacity-60"
            >
              <div className="font-semibold">Spin</div>
              <div className="text-pink-200/80 mt-0.5">From A$1</div>
            </button>
          </div>
        </section>

        <LiveSupportBubble
          credits={credits}
          disabled={creditsLoading || supportBusy}
          onTip={() => handleSupportClick("tip")}
          onBoost={() => handleSupportClick("boost")}
          onSpin={() => handleSupportClick("spin")}
        />
      </main>

      {pendingPurchase && (
        <LivePurchaseChoiceSheet
          mode={pendingPurchase.mode}
          onClose={() => setPendingPurchase(null)}
          onSingle={() => handleSingle(pendingPurchase.mode)}
          onPack={() => handlePack(pendingPurchase.mode)}
        />
      )}
    </div>
  );
}

/* ---------------------- Purchase choice sheet ---------------------- */

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
  const modeLabel = mode === "tip" ? "Tip" : mode === "boost" ? "Boost" : "Spin";

  const singleAmount = mode === "tip" ? "A$2" : mode === "boost" ? "A$5" : "A$1";
  const packAmount = mode === "tip" ? "A$20" : mode === "boost" ? "A$50" : "A$20";

  const packLabel = mode === "tip" ? "tip pack" : mode === "boost" ? "boost pack" : "spin pack";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm mb-6 mx-4 rounded-2xl bg-[#070b1b] border border-white/10 p-4 space-y-3 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Support with a {modeLabel}</h2>
          <button onClick={onClose} className="text-xs text-white/50 hover:text-white">
            Close
          </button>
        </div>

        <p className="text-xs text-white/60">
          Choose a one-off {modeLabel.toLowerCase()} or grab a {packLabel} to avoid checking out each time.
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
            <div className="text-[11px] text-emerald-200/80">Quick one-off support</div>
          </button>

          <button
            type="button"
            onClick={onPack}
            className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 px-3 py-2 text-xs text-left"
          >
            <div className="font-semibold">
              Buy {packLabel} ({packAmount})
            </div>
            <div className="text-[11px] text-white/70">Better value, more {modeLabel.toLowerCase()}s</div>
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

/* ---------------------- Floating credits bubble -------------------- */

type LiveSupportBubbleProps = {
  credits: CreditBalances | null;
  disabled?: boolean;
  onTip: () => void;
  onBoost: () => void;
  onSpin: () => void;
};

function LiveSupportBubble({ credits, disabled, onTip, onBoost, onSpin }: LiveSupportBubbleProps) {
  const [open, setOpen] = useState(false);

  const tips = credits?.tip ?? 0;
  const boosts = credits?.boost ?? 0;
  const spins = credits?.spin ?? 0;

  return (
    <div className="fixed bottom-24 right-4 z-40 sm:bottom-28 sm:right-6">
      {!open && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 rounded-full bg-black/70 border border-white/20 px-3 py-2 shadow-lg shadow-black/60 backdrop-blur-lg text-xs sm:text-sm hover:bg-black/85 disabled:opacity-60"
        >
          <span className="font-semibold text-white/90">Your credits</span>
          <span className="flex items-center gap-1 text-emerald-200">🪙 <span>{tips}</span></span>
          <span className="flex items-center gap-1 text-sky-200">🚀 <span>{boosts}</span></span>
          <span className="flex items-center gap-1 text-indigo-200">💧 <span>{spins}</span></span>
        </button>
      )}

      {open && (
        <div className="rounded-2xl bg-[#050814]/95 border border-white/15 px-3 py-3 shadow-2xl shadow-black/70 w-64 max-w-[80vw] backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/80">Support this stream</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-white/40 hover:text-white/70"
            >
              Close
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] mb-2 text-white/60">
            <span className="flex items-center gap-1">🪙 <span>{tips}</span> tips</span>
            <span className="flex items-center gap-1">🚀 <span>{boosts}</span> boosts</span>
            <span className="flex items-center gap-1">💧 <span>{spins}</span> spins</span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={onTip}
              className="w-full rounded-xl border border-emerald-400/60 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-2 text-left text-xs text-emerald-50 disabled:opacity-60"
            >
              <div className="font-semibold">
                Tip A$2 <span className="ml-1 text-[10px] text-emerald-200/80">({tips} left)</span>
              </div>
              <div className="text-[11px] text-emerald-100/80">Quick appreciation</div>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={onBoost}
              className="w-full rounded-xl border border-sky-400/60 bg-sky-500/15 hover:bg-sky-500/25 px-3 py-2 text-left text-xs text-sky-50 disabled:opacity-60"
            >
              <div className="font-semibold">
                Boost A$5 <span className="ml-1 text-[10px] text-sky-200/80">({boosts} left)</span>
              </div>
              <div className="text-[11px] text-sky-100/80">Push this stream up</div>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={onSpin}
              className="w-full rounded-xl border border-fuchsia-400/70 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 px-3 py-2 text-left text-xs text-fuchsia-50 disabled:opacity-60"
            >
              <div className="font-semibold">
                Spin A$1 <span className="ml-1 text-[10px] text-fuchsia-200/80">({spins} left)</span>
              </div>
              <div className="text-[11px] text-fuchsia-100/80">Light-touch support</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

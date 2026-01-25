"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Reason =
  | "BREAK"
  | "CONFUSING"
  | "NO_VALUE"
  | "BUGS"
  | "PRIVACY"
  | "SAFETY"
  | "OTHER";

const REASONS: Array<{ key: Reason; label: string }> = [
  { key: "BREAK", label: "Taking a break" },
  { key: "CONFUSING", label: "Too hard to use / confusing" },
  { key: "NO_VALUE", label: "Not enough value yet" },
  { key: "BUGS", label: "Technical issues / bugs" },
  { key: "PRIVACY", label: "Privacy concerns" },
  { key: "SAFETY", label: "Safety concerns (harassment, scams, impersonation, etc.)" },
  { key: "OTHER", label: "Other" },
];

export default function DeactivateAccountPage() {
  const router = useRouter();
  const [reason, setReason] = useState<Reason>("BREAK");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const showSafetyPrompt = useMemo(() => reason === "SAFETY", [reason]);

  async function submitDeactivate() {
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await fetch("/api/account/deactivate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason, feedback }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Unable to deactivate right now.");
        return;
      }
      setDone("Your account has been deactivated.");
      setTimeout(() => router.push("/feed"), 800);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 relative">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute right-4 top-4 text-white/50 hover:text-white/80 text-sm"
          aria-label="Close"
          title="Close"
        >
          ✕
        </button>

        <h1 className="text-2xl font-semibold">Deactivate Account</h1>
        <p className="mt-2 text-sm text-white/70 leading-6">
          Deactivating hides your profile and disables access until you choose to reactivate.
          Your data is kept so you can return anytime.
        </p>

        <div className="mt-6 space-y-2">
          <div className="text-sm text-white/80 font-semibold">Reason (optional)</div>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r.key}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 cursor-pointer hover:bg-black/30"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.key}
                  checked={reason === r.key}
                  onChange={() => setReason(r.key)}
                  className="mt-1"
                />
                <span className="text-sm text-white/80">{r.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <div className="text-sm text-white/80 font-semibold">Tell us more (optional)</div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/90 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/20"
              rows={4}
              placeholder="Anything we should know?"
            />
          </div>
        </div>

        {showSafetyPrompt ? (
          <div className="mt-6 rounded-xl border border-yellow-300/20 bg-yellow-400/10 p-4">
            <div className="text-sm font-semibold text-yellow-200">If you feel unsafe</div>
            <div className="mt-1 text-sm text-white/70">
              You can report an issue before you go.
            </div>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/support")}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Report an issue
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submitDeactivate}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/15 disabled:opacity-50"
              >
                Continue to deactivate
              </button>
            </div>
          </div>
        ) : null}

        {err ? (
          <div className="mt-6 rounded-xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">
            {err}
          </div>
        ) : null}

        {done ? (
          <div className="mt-6 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            {done}
          </div>
        ) : null}

        {!showSafetyPrompt ? (
          <div className="mt-6">
            <button
              type="button"
              disabled={busy}
              onClick={submitDeactivate}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/90 hover:bg-white/15 disabled:opacity-50"
            >
              {busy ? "Deactivating..." : "Deactivate my account"}
            </button>
            <div className="mt-3 text-xs text-white/50">You can reactivate later by signing in.</div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

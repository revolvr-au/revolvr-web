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

export default function DeleteAccountPage() {
  const router = useRouter();
  const [reason, setReason] = useState<Reason>("BREAK");
  const [feedback, setFeedback] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canDelete = useMemo(() => ack && !busy, [ack, busy]);

  async function submitDelete() {
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason, feedback, ack: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Unable to delete right now.");
        return;
      }
      setDone("Your account has been deleted.");
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

        <h1 className="text-2xl font-semibold">Delete Account</h1>
        <p className="mt-2 text-sm text-white/70 leading-6">
          Deleting your account is permanent. Once deleted, your account and associated data cannot be recovered.
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

        <div className="mt-6 rounded-xl border border-red-300/20 bg-red-400/10 p-4">
          <div className="text-sm font-semibold text-red-100">Warning</div>
          <div className="mt-1 text-sm text-white/70">
            Account deletion is permanent. We cannot recover your account after it is deleted.
          </div>

          <label className="mt-3 flex items-start gap-3">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-white/80">
              I understand that deleting my account is permanent and cannot be undone.
            </span>
          </label>

          <div className="mt-3 text-xs text-white/50">
            Some limited records may be retained where required for legal, security, fraud prevention, or financial compliance.
          </div>
        </div>

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

        <div className="mt-6">
          <button
            type="button"
            disabled={!canDelete}
            onClick={submitDelete}
            className="w-full rounded-xl border border-red-300/20 bg-red-500/20 px-4 py-3 text-sm text-red-100 hover:bg-red-500/25 disabled:opacity-50"
          >
            {busy ? "Deleting..." : "Delete my account"}
          </button>

          <div className="mt-3 text-xs text-white/50">
            Prefer a break instead?{" "}
            <a href="/deactivate-account" className="underline hover:text-white/80">
              Deactivate your account
            </a>
            .
          </div>
        </div>
      </div>
    </main>
  );
}

// src/components/PostActionModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Preset = { label: string; amountCents: number };

type Props = {
  open: boolean;
  onClose: () => void;

  title: string; // e.g. "Tip creator"
  subtitle?: string; // e.g. "Support creator"
  icon?: string; // e.g. "💰"

  // If user is not authed, we show a login CTA instead of confirm UI.
  isAuthed: boolean;
  loginHref?: string; // fallback "/login"

  presets?: Preset[]; // default amounts
  defaultAmountCents?: number;

  confirmLabel?: string; // e.g. "Send tip"
  onConfirm: (amountCents: number) => Promise<void>;

  busy?: boolean; // optional external busy state
};

export default function PostActionModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  isAuthed,
  loginHref = "/login",
  presets,
  defaultAmountCents = 500,
  confirmLabel = "Confirm",
  onConfirm,
  busy,
}: Props) {
  const defaultPresets = useMemo<Preset[]>(
    () =>
      presets ?? [
        { label: "$5", amountCents: 500 },
        { label: "$10", amountCents: 1000 },
        { label: "$25", amountCents: 2500 },
        { label: "$50", amountCents: 5000 },
      ],
    [presets]
  );

  const [amountCents, setAmountCents] = useState(defaultAmountCents);
  const [custom, setCustom] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isBusy = Boolean(busy ?? localBusy);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setLocalBusy(false);
    setAmountCents(defaultAmountCents);
    setCustom("");
  }, [open, defaultAmountCents]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleConfirm() {
    try {
      setErr(null);
      setLocalBusy(true);
      await onConfirm(amountCents);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLocalBusy(false);
    }
  }

  function applyCustom(v: string) {
    setCustom(v);
    const cleaned = v.replace(/[^\d.]/g, "");
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n <= 0) return;
    setAmountCents(Math.round(n * 100));
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* panel */}
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0B0F1A]/95 shadow-2xl shadow-black/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-[18px] leading-none">{icon}</span> : null}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">{title}</span>
              {subtitle ? <span className="text-xs text-white/50">{subtitle}</span> : null}
            </div>
          </div>

          <button
            type="button"
            className="text-white/60 hover:text-white rounded-lg px-2 py-1 hover:bg-white/5"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          {!isAuthed ? (
            <div className="space-y-3">
              <div className="text-sm text-white/70">You need to log in to continue.</div>
              <a
                href={loginHref}
                className="inline-flex items-center justify-center w-full rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-semibold py-3 transition-colors"
              >
                Login
              </a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {defaultPresets.map((p) => (
                  <button
                    key={p.amountCents}
                    type="button"
                    onClick={() => setAmountCents(p.amountCents)}
                    className={[
                      "rounded-xl border px-2 py-2 text-xs font-semibold transition-all",
                      amountCents === p.amountCents
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10",
                    ].join(" ")}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-white/50 w-14">Custom</div>
                <input
                  value={custom}
                  onChange={(e) => applyCustom(e.target.value)}
                  placeholder="e.g. 7.50"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/15"
                  inputMode="decimal"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-white/50">
                  Amount:{" "}
                  <span className="text-white/80">${(amountCents / 100).toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  disabled={isBusy || amountCents <= 0}
                  onClick={handleConfirm}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                    isBusy
                      ? "bg-white/10 text-white/40 cursor-not-allowed"
                      : "bg-white/10 text-white hover:bg-white/15",
                  ].join(" ")}
                >
                  {isBusy ? "Working…" : confirmLabel}
                </button>
              </div>

              {err ? (
                <div className="text-xs text-red-200 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
                  {err}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// src/components/PostActionModal.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type Preset = { label: string; amountCents: number };

export type PostActionModalProps = {
  open: boolean;
  onClose: () => void;

  title: string;
  subtitle?: string;
  icon?: string;

  // If user is not authed, show login CTA instead of confirm UI.
  isAuthed: boolean;
  loginHref?: string;

  // If provided, we will IGNORE preset.label for display and format from amountCents
  // to avoid rounding/duplicate-label bugs (e.g. $1.50 showing as $2).
  presets?: Preset[];
  defaultAmountCents?: number;

  confirmLabel?: string;
  onConfirm: (amountCents: number) => Promise<void>;

  // Optional external busy state (e.g. parent tracks busy); modal will OR with local busy.
  busy?: boolean;

  // Show/hide custom input; default true.
  allowCustom?: boolean;

  // Currency for formatting (e.g. "aud", "usd", "eur"). Defaults to "aud".
  currency?: string;
};

const ZERO_DECIMAL_CURRENCIES = new Set([
  "JPY",
  "KRW",
  "VND",
  "CLP",
  "PYG",
  "RWF",
  "UGX",
  "XAF",
  "XOF",
  "XPF",
]);

function normalizeCurrency(currency: unknown) {
  const cur = String(currency ?? "AUD").trim().toUpperCase();
  return cur || "AUD";
}

function currencyMinorUnit(cur: string): 0 | 2 {
  return ZERO_DECIMAL_CURRENCIES.has(normalizeCurrency(cur)) ? 0 : 2;
}

/**
 * Formats our internal "cents model" consistently.
 * - For 2-decimal currencies: amountCents/100 with 2 decimals
 * - For 0-decimal currencies: amountCents/100 with 0 decimals (we require divisibility elsewhere)
 */
function formatCents(amountCents: number, currency: string) {
  const cur = normalizeCurrency(currency);
  const mu = currencyMinorUnit(cur);

  // internal cents-model always stores "cents", even for 0-decimal currencies
  const value = amountCents / 100;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: mu,
      maximumFractionDigits: mu,
    }).format(value);
  } catch {
    return `${cur} ${mu === 0 ? Math.round(value).toString() : value.toFixed(2)}`;
  }
}

/**
 * Parses user input as MAJOR units and converts into our "cents model".
 * - 2-decimal currencies: "7.50" -> 750
 * - 0-decimal currencies: "500" -> 50000 (so Stripe unit_amount becomes 500)
 */
function parseCurrencyInputToCentsModel(input: string, currency: string): number | null {
  const cur = normalizeCurrency(currency);
  const mu = currencyMinorUnit(cur);

  const cleaned = input.replace(/[^\d.]/g, "");
  if (!cleaned) return null;

  if (mu === 0) {
    // allow only whole units (ignore decimals)
    const whole = cleaned.split(".")[0] ?? "";
    const n = Number(whole);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n) * 100; // convert to cents-model
  }

  // 2-decimal: allow decimals; keep at most one dot
  const parts = cleaned.split(".");
  const normalized = parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;

  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;

  return Math.round(n * 100);
}

function dedupeByAmountCents(list: { amountCents: number }[]) {
  const seen = new Set<number>();
  const out: typeof list = [];
  for (const p of list) {
    if (seen.has(p.amountCents)) continue;
    seen.add(p.amountCents);
    out.push(p);
  }
  return out;
}

function defaultTipLikePresets(currency: string): number[] {
  const cur = normalizeCurrency(currency).toLowerCase();

  // You can tune these per currency. The key thing is: amounts are in "cents model".
  // USD/EUR/GBP: show 1.50, 2, 5, 10
  if (cur === "usd" || cur === "eur" || cur === "gbp") return [150, 200, 500, 1000];

  // AUD/CAD/NZD: show 2, 5, 10, 20 (feel free to change)
  return [200, 500, 1000, 2000];
}

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
  allowCustom = true,
  currency = "aud",
}: PostActionModalProps) {
  const currencyCode = useMemo(() => normalizeCurrency(currency), [currency]);

  // IMPORTANT:
  // - If presets are provided by caller, we intentionally ignore preset.label and format from amountCents
  //   so $1.50 never gets rendered as $2 due to rounding or mis-formatting upstream.
  // - We also dedupe by amountCents to prevent duplicate "$2" style buttons.
  const effectivePresets = useMemo(() => {
    const base = presets?.length
      ? presets.map((p) => ({ amountCents: p.amountCents }))
      : defaultTipLikePresets(currencyCode).map((c) => ({ amountCents: c }));
    const initialAmountCents = useMemo(() => {
  if (typeof defaultAmountCents === "number" && defaultAmountCents > 0) return defaultAmountCents;
  return effectivePresets[0]?.amountCents ?? 500;
}, [defaultAmountCents, effectivePresets]);

    return dedupeByAmountCents(base).map((p) => ({
      amountCents: p.amountCents,
      label: formatCents(p.amountCents, currencyCode),
    }));
  }, [presets, currencyCode]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [amountCents, setAmountCents] = useState<number>(initialAmountCents);
  const [custom, setCustom] = useState<string>("");
  const [localBusy, setLocalBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const isBusy = Boolean(busy ?? localBusy);

  // Reset state on open
  useEffect(() => {
  if (!open) return;
  setErr(null);
  setLocalBusy(false);
  setAmountCents(initialAmountCents);
  setCustom("");
}, [open, initialAmountCents]);


  // If currency changes while open, keep numeric amount but clear custom input
  useEffect(() => {
    if (!open) return;
    setCustom("");
  }, [currencyCode, open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Focus management on open
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (allowCustom && isAuthed) inputRef.current?.focus();
      else panelRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, allowCustom, isAuthed]);

  if (!open) return null;

  async function handleConfirm() {
    if (isBusy) return;

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

  function onBackdropMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function onCustomChange(v: string) {
    setCustom(v);
    const centsModel = parseCurrencyInputToCentsModel(v, currencyCode);
    if (centsModel != null) setAmountCents(centsModel);
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
        onMouseDown={onBackdropMouseDown}
      />

      {/* panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F1A]/95 shadow-2xl shadow-black/60"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-[18px] leading-none">{icon}</span> : null}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">{title}</span>
              {subtitle ? <span className="text-xs text-white/50">{subtitle}</span> : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-white/60 hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </div>

        {/* body */}
        <div className="space-y-3 px-4 py-4">
          {!isAuthed ? (
            <div className="space-y-3">
              <div className="text-sm text-white/70">You need to log in to continue.</div>
              <a
                href={loginHref}
                className="inline-flex w-full items-center justify-center rounded-xl bg-pink-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink-500"
              >
                Login
              </a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {effectivePresets.map((p) => {
                  const selected = amountCents === p.amountCents && custom === "";
                  return (
                    <button
                      key={`${p.amountCents}`}
                      type="button"
                      onClick={() => {
                        setAmountCents(p.amountCents);
                        setCustom("");
                      }}
                      className={[
                        "rounded-xl border px-2 py-2 text-xs font-semibold transition-all",
                        selected
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                      ].join(" ")}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {allowCustom ? (
                <div className="flex items-center gap-2">
                  <div className="w-14 text-xs text-white/50">Custom</div>
                  <input
                    ref={inputRef}
                    value={custom}
                    onChange={(e) => onCustomChange(e.target.value)}
                    placeholder={currencyMinorUnit(currencyCode) === 0 ? "e.g. 500" : "e.g. 7.50"}
                    inputMode="decimal"
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/15"
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-white/50">
                  Amount: <span className="text-white/80">{formatCents(amountCents, currencyCode)}</span>
                </div>

                <button
                  type="button"
                  disabled={isBusy || amountCents <= 0}
                  onClick={handleConfirm}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                    isBusy || amountCents <= 0
                      ? "cursor-not-allowed bg-white/10 text-white/40"
                      : "bg-white/10 text-white hover:bg-white/15",
                  ].join(" ")}
                >
                  {isBusy ? "Working…" : confirmLabel}
                </button>
              </div>

              {err ? (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
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

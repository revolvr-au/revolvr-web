// src/lib/purchase.ts
"use client";

export type CheckoutMode =
  | "tip"
  | "boost"
  | "spin"
  | "tip-pack"
  | "boost-pack"
  | "spin-pack"
  | "reaction"
  | "vote";

export type SupportSource = "FEED" | "LIVE";

export type StartCheckoutOptions = {
  mode: CheckoutMode;

  // REQUIRED for ledger attribution
  creatorEmail: string;

  // viewer/payer email (recommended)
  userEmail?: string | null;

  // optional context
  source?: SupportSource;
  targetId?: string | null;

  // legacy/back-compat (server can still accept it)
  postId?: string | null;

  // REQUIRED for predictable redirect flow
  returnPath?: string | null;

  // cents chosen in modal (optional; if omitted server defaults apply)
  amountCents?: number | null;

  // Optional override; if omitted we infer from browser locale
  viewerCurrency?: string | null;
};

type CheckoutPayload = {
  mode: CheckoutMode;
  creatorEmail: string;
  userEmail: string | null;
  source: SupportSource;
  targetId: string | null;
  postId: string | null;
  returnPath: string;
  amountCents: number | null;

  // NEW: desired charge currency (server will normalize + fallback)
  viewerCurrency: string | null;
};

type CheckoutResponse = { url?: string };

function viewerCurrencyFromLocale(): string {
  // Simple locale mapping (good enough for launch)
  const lang = (typeof navigator !== "undefined" ? navigator.language : "")?.toLowerCase() ?? "";

  if (lang.startsWith("en-gb")) return "gbp";
  if (lang.startsWith("en-au")) return "aud";
  if (lang.startsWith("en-nz")) return "nzd";
  if (lang.startsWith("en-ca")) return "cad";

  // Common Euro locales (expand later)
  if (
    lang.startsWith("de") ||
    lang.startsWith("fr") ||
    lang.startsWith("es") ||
    lang.startsWith("it") ||
    lang.startsWith("nl") ||
    lang.startsWith("pt") ||
    lang.startsWith("fi") ||
    lang.startsWith("sv") ||
    lang.startsWith("da") ||
    lang.startsWith("el") ||
    lang.startsWith("ga")
  ) {
    return "eur";
  }

  return "usd";
}

export async function startCheckout(opts: StartCheckoutOptions): Promise<void> {
  const payload: CheckoutPayload = {
    mode: opts.mode,
    creatorEmail: String(opts.creatorEmail || "").trim().toLowerCase(),
    userEmail: (opts.userEmail ?? null)?.toString().trim().toLowerCase() || null,
    source: opts.source ?? "FEED",
    targetId: opts.targetId ?? null,
    postId: opts.postId ?? null,
    returnPath: opts.returnPath ?? "/public-feed",
    amountCents: typeof opts.amountCents === "number" ? Math.round(opts.amountCents) : null,

    viewerCurrency:
      (opts.viewerCurrency ?? "").toString().trim().toLowerCase() || viewerCurrencyFromLocale(),
  };

  if (!payload.creatorEmail) throw new Error("Missing creatorEmail");

  const res = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`checkout failed (${res.status}): ${text}`);
  }

  const data = (await res.json().catch(() => ({}))) as CheckoutResponse;

  if (typeof data.url === "string" && data.url.length > 0) {
    window.location.href = data.url;
    return;
  }

  throw new Error("Stripe did not return a checkout URL.");
}

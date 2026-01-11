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

  // optional cents chosen in UI; if omitted server defaults apply
  amountCents?: number | null;

  // viewer/payer email (recommended)
  userEmail?: string | null;

  // optional context
  source?: SupportSource;
  targetId?: string | null;

  // legacy/back-compat (server can still accept it)
  postId?: string | null;

  // REQUIRED for predictable redirect flow
  returnPath?: string | null;
};

type CheckoutPayload = {
  mode: CheckoutMode;
  creatorEmail: string;
  amountCents?: number | null;
  userEmail: string | null;
  source: SupportSource;
  targetId: string | null;
  postId: string | null;
  returnPath: string;
};

type CheckoutResponse = { url?: string };

export async function startCheckout(opts: StartCheckoutOptions): Promise<void> {
  const payload: CheckoutPayload = {
    mode: opts.mode,
    creatorEmail: String(opts.creatorEmail || "").trim().toLowerCase(),
    amountCents: typeof opts.amountCents === "number" ? opts.amountCents : null,
    userEmail: (opts.userEmail ?? null)?.toString().trim().toLowerCase() || null,
    source: opts.source ?? "FEED",
    targetId: opts.targetId ?? null,
    postId: opts.postId ?? null,
    returnPath: opts.returnPath ?? "/public-feed",
  };

  if (!payload.creatorEmail) {
    throw new Error("Missing creatorEmail");
  }

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

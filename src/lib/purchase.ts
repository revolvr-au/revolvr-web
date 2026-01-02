// src/lib/purchase.ts
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
};

export async function startCheckout(opts: StartCheckoutOptions) {
  const payload = {
    mode: opts.mode,
    creatorEmail: String(opts.creatorEmail || "").trim().toLowerCase(),
    userEmail: (opts.userEmail ?? null)?.toString().trim().toLowerCase() || null,
    source: (opts.source ?? "FEED") as SupportSource,
    targetId: opts.targetId ?? null,
    postId: opts.postId ?? null,
    returnPath: opts.returnPath ?? "/public-feed",
  };

  const res = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`checkout failed (${res.status}): ${text}`);
  }

  const data = await res.json().catch(() => ({} as any));
  if (data?.url) {
    window.location.href = data.url;
    return;
  }

  throw new Error("Stripe did not return a checkout URL.");
}

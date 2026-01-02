// src/lib/purchase.ts
export type CheckoutMode =
  | "tip"
  | "boost"
  | "spin"
  | "tip-pack"
  | "boost-pack"
  | "spin-pack";

type SupportSource = "FEED" | "LIVE";

type PurchaseOptions = {
  kind: "tip" | "boost" | "spin";
  isPack?: boolean;

  // REQUIRED by /api/payments/checkout
  creatorEmail: string;

  // viewer/payer email (optional)
  userEmail?: string | null;

  // new target
  targetId?: string | null;

  // legacy
  postId?: string | null;

  source?: SupportSource;
  returnPath?: string | null;
};

export async function startCheckout(options: PurchaseOptions) {
  const {
    kind,
    isPack,
    creatorEmail,
    userEmail,
    targetId,
    postId,
    source = "FEED",
    returnPath = "/public-feed",
  } = options;

  const modeMap = {
    tip: isPack ? "tip-pack" : "tip",
    boost: isPack ? "boost-pack" : "boost",
    spin: isPack ? "spin-pack" : "spin",
  } as const;

  const mode: CheckoutMode = modeMap[kind];

  if (!creatorEmail) {
    console.error("[purchase] missing creatorEmail");
    return;
  }

  const res = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      creatorEmail,
      userEmail,
      source,
      targetId: targetId ?? postId ?? null,
      postId: postId ?? null,
      returnPath,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Stripe checkout error:", data);
    return;
  }

  if (data?.url) window.location.href = data.url;
  else console.error("Stripe checkout missing url:", data);
}

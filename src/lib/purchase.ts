// src/lib/purchase.ts
export type CheckoutMode =
  | "tip"
  | "boost"
  | "spin"
  | "tip-pack"
  | "boost-pack"
  | "spin-pack";

type PurchaseOptions = {
  kind: "tip" | "boost" | "spin";
  isPack?: boolean;
  postId?: string | null;
  userEmail?: string | null;
};

export async function startCheckout(options: PurchaseOptions) {
  const { kind, isPack, postId, userEmail } = options;

  const modeMap = {
    tip: isPack ? "tip-pack" : "tip",
    boost: isPack ? "boost-pack" : "boost",
    spin: isPack ? "spin-pack" : "spin",
  } as const;

  const mode: CheckoutMode = modeMap[kind];

  const res = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      postId,
      userEmail,
    }),
  });

  const data = await res.json();

  if (data?.url) {
    window.location.href = data.url;
  } else {
    console.error("Stripe checkout error:", data);
  }
}

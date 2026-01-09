// src/lib/actionsClient.ts
export type CheckoutMode =
  | "tip"
  | "boost"
  | "spin"
  | "tip-pack"
  | "boost-pack"
  | "spin-pack"
  | "reaction"
  | "vote";

export async function createCheckout(input: {
  mode: CheckoutMode;
  creatorEmail: string;
  userEmail?: string | null;
  targetId?: string | null;
  postId?: string | null;
  source?: "FEED" | "LIVE";
  returnPath?: string | null;
}) {
  const res = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      json && typeof json.error === "string" ? json.error : "Checkout failed.";
    throw new Error(msg);
  }

  const url = json && typeof json.url === "string" ? json.url : "";
  if (!url) throw new Error("Missing checkout url.");
  return { url };
}

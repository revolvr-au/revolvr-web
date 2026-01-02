"use client";

import { useCallback, useMemo, useState } from "react";
import { startCheckout } from "@/lib/purchase";
import type { CheckoutMode } from "@/lib/purchase";

export type PurchaseKind = "tip" | "boost" | "spin";

type UsePurchaseOptions = {
  isPack?: boolean;
  postId?: string | null;
  userEmail?: string | null;
  returnPath?: string | null;
};

function toMode(kind: PurchaseKind, isPack?: boolean): CheckoutMode {
  if (kind === "tip") return (isPack ? "tip-pack" : "tip") as CheckoutMode;
  if (kind === "boost") return (isPack ? "boost-pack" : "boost") as CheckoutMode;
  return (isPack ? "spin-pack" : "spin") as CheckoutMode;
}

export function usePurchase(defaultEmail?: string | null) {
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const normalizedDefaultEmail = useMemo(() => {
    const e = (defaultEmail ?? "").trim().toLowerCase();
    return e || null;
  }, [defaultEmail]);

  const purchase = useCallback(
    async (kind: PurchaseKind, opts: UsePurchaseOptions = {}) => {
      if (loading) return;

      setLoading(true);
      setLastError(null);

      try {
        const email = (opts.userEmail ?? normalizedDefaultEmail ?? "").trim().toLowerCase();

        // If we don't have an email, fail fast (prevents null typing + bad requests)
        if (!email) {
          setLastError("You need to be signed in to purchase.");
          return;
        }

        const mode = toMode(kind, opts.isPack);

        await startCheckout({
          mode,
          creatorEmail: email, // TEMP self attribution; later swap to actual creator where applicable
          userEmail: email,
          source: "FEED",
          targetId: opts.postId ?? null,
          returnPath: opts.returnPath ?? "/public-feed",
        });
      } catch (err) {
        console.error("[usePurchase] error", err);
        setLastError("Something went wrong starting checkout.");
      } finally {
        setLoading(false);
      }
    },
    [loading, normalizedDefaultEmail]
  );

  return { purchase, loading, lastError };
}

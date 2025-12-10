"use client";

import { useCallback, useState } from "react";
import { startCheckout } from "@/lib/purchase";

type PurchaseKind = "tip" | "boost" | "spin";

export function usePurchase(defaultEmail?: string | null) {
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const run = useCallback(
    async (kind: PurchaseKind, opts: { isPack?: boolean; postId?: string | null; userEmail?: string | null } = {}) => {
      if (loading) return; // simple guard

      setLoading(true);
      setLastError(null);

      try {
        await startCheckout({
          kind,
          isPack: opts.isPack,
          postId: opts.postId,
          userEmail: opts.userEmail ?? defaultEmail ?? undefined,
        });
      } catch (err) {
        console.error("Purchase error", err);
        setLastError("Something went wrong starting checkout.");
      } finally {
        setLoading(false);
      }
    },
    [defaultEmail, loading]
  );

  // Convenience wrappers
  const tip = useCallback(
    (postId: string | null) => run("tip", { isPack: false, postId }),
    [run]
  );
  const tipPack = useCallback(
    () => run("tip", { isPack: true }),
    [run]
  );

  const boost = useCallback(
    (postId: string | null) => run("boost", { isPack: false, postId }),
    [run]
  );
  const boostPack = useCallback(
    () => run("boost", { isPack: true }),
    [run]
  );

  const spin = useCallback(
    () => run("spin", { isPack: false }),
    [run]
  );
  const spinPack = useCallback(
    () => run("spin", { isPack: true }),
    [run]
  );

  return {
    loading,
    lastError,
    // generic
    run,
    // specific helpers
    tip,
    tipPack,
    boost,
    boostPack,
    spin,
    spinPack,
  };
}

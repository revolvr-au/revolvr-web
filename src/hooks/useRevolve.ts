"use client";

// src/hooks/useRevolve.ts
//
// Phase 2: flick counter + charge state for "The Revolve". Lives in feed-local state
// (instantiated inside PublicFeedClient). A "completed flick" is detected by waiting for
// the scroll to SETTLE — a half-swipe that snaps back resolves to the same index and is
// therefore never counted. cadenceN comes from RevolveConfig (never hardcoded).
//
// Phase 3 will extend this hook with the revolve open/close state machine and call
// resetCharge() after each revolve.

import { useCallback, useEffect, useRef, useState } from "react";
import type { RevolveConfig } from "@/lib/revolve/config";

/** Quiet period after the last scroll event before we treat the index as settled. */
const SETTLE_MS = 120;

export type UseRevolve = {
  /** 0 → cadenceN. Full bar telegraphs the imminent revolve. */
  chargeCount: number;
  /** Feed onScroll hook: report the current rounded index; counting happens on settle. */
  registerScrollIndex: (index: number) => void;
  /** Reset charge to 0 and rebase the flick origin to the current index (Phase 3 uses this). */
  resetCharge: () => void;
};

export function useRevolve(config: RevolveConfig): UseRevolve {
  const [chargeCount, setChargeCount] = useState(0);

  const lastSettledIndexRef = useRef(0);
  const latestIndexRef = useRef(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerScrollIndex = useCallback(
    (index: number) => {
      if (!config.enabled) return;
      latestIndexRef.current = index;
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        const settled = latestIndexRef.current;
        const prev = lastSettledIndexRef.current;
        // Only a forward, settled advance counts. Snap-back (settled === prev) is ignored;
        // backward scroll updates the baseline without charging.
        if (settled > prev) {
          const advanced = settled - prev;
          setChargeCount((c) => Math.min(config.cadenceN, c + advanced));
        }
        lastSettledIndexRef.current = settled;
      }, SETTLE_MS);
    },
    [config.enabled, config.cadenceN],
  );

  const resetCharge = useCallback(() => {
    setChargeCount(0);
    lastSettledIndexRef.current = latestIndexRef.current;
  }, []);

  // Drop charge if the flag is turned off at runtime (dev toggle).
  useEffect(() => {
    if (!config.enabled) setChargeCount(0);
  }, [config.enabled]);

  // Clear any pending settle timer on unmount.
  useEffect(
    () => () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    },
    [],
  );

  return { chargeCount, registerScrollIndex, resetCharge };
}

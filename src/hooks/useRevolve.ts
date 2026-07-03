"use client";

// src/hooks/useRevolve.ts
//
// Phase 2: flick counter + charge state for "The Revolve". A "completed flick" is detected by
// waiting for the scroll to SETTLE — a half-swipe that snaps back resolves to the same index
// and is therefore never counted. cadenceN comes from RevolveConfig (never hardcoded).
//
// Phase 3: the open/close state machine. The charge bar fills to cadenceN ("armed"); the feed
// keeps scrolling normally; the NEXT completed forward flick while armed OPENS the revolve
// (deliberately not an auto-fire the instant the bar tops out). Opening resets charge.
//
//   idle ──charge hits cadenceN──▶ armed ──next forward flick──▶ open ──close()──▶ closing ──▶ idle
//
// While the overlay is open/closing the feed is paused, so scroll registration is ignored.

import { useCallback, useEffect, useRef, useState } from "react";
import type { RevolveConfig } from "@/lib/revolve/config";

/** Quiet period after the last scroll event before we treat the index as settled. */
const SETTLE_MS = 120;
/** Exit-animation budget: how long the overlay stays mounted in 'closing' before unmount. */
const CLOSE_MS = 320;

export type RevolveStatus = "idle" | "armed" | "open" | "closing";

/**
 * Debug-only event stream (testMode HUD). `scroll` fires on every raw registerScrollIndex
 * call — so the HUD reveals whether mobile onScroll even fires; `settle` fires when the
 * quiet-period timer resolves, exposing the exact desktop/mobile divergence point.
 */
export type RevolveDebugEvent =
  | { type: "scroll"; index: number }
  | {
      type: "settle";
      settled: number;
      prev: number;
      charged: boolean;
      charge: number;
      status: RevolveStatus;
    };

export type UseRevolve = {
  /** 0 → cadenceN. Full bar telegraphs the imminent revolve. */
  chargeCount: number;
  /** Lifecycle of the revolve overlay. Overlay renders only on 'open' | 'closing'. */
  status: RevolveStatus;
  /** Feed onScroll hook: report the current rounded index; counting happens on settle. */
  registerScrollIndex: (index: number) => void;
  /** Begin the exit animation, then return to idle after the close budget. */
  closeRevolve: () => void;
  /** Reset charge to 0 and rebase the flick origin to the current index. */
  resetCharge: () => void;
};

export function useRevolve(
  config: RevolveConfig,
  onDebug?: (e: RevolveDebugEvent) => void,
): UseRevolve {
  const [chargeCount, setChargeCount] = useState(0);
  const [status, setStatus] = useState<RevolveStatus>("idle");

  // Mirror the debug sink in a ref so registerScrollIndex needn't list it as a dep
  // (it stays a stable callback; the HUD wiring is a pure read-out with no behavior).
  const onDebugRef = useRef(onDebug);
  onDebugRef.current = onDebug;

  const lastSettledIndexRef = useRef(0);
  const latestIndexRef = useRef(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs mirror state so the settle callback decides from live values without re-subscribing.
  const chargeRef = useRef(0);
  const statusRef = useRef<RevolveStatus>("idle");

  const setCharge = useCallback((n: number) => {
    chargeRef.current = n;
    setChargeCount(n);
  }, []);

  const setRevolveStatus = useCallback((s: RevolveStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const registerScrollIndex = useCallback(
    (index: number) => {
      if (!config.enabled) return;
      // Emit the raw event first — before any early return — so the HUD shows whether
      // onScroll fires at all on mobile, even when the overlay is currently paused.
      onDebugRef.current?.({ type: "scroll", index });
      // Feed is paused while the overlay owns the screen — ignore any stray scroll.
      if (statusRef.current === "open" || statusRef.current === "closing") return;
      latestIndexRef.current = index;
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        const settled = latestIndexRef.current;
        const prev = lastSettledIndexRef.current;
        // Only a forward, settled advance counts. Snap-back (settled === prev) is ignored;
        // backward scroll updates the baseline without charging.
        if (settled > prev) {
          if (chargeRef.current >= config.cadenceN) {
            // Already armed AND a fresh forward flick landed — THIS is the trigger.
            setCharge(0); // opening resets charge (Phase 3 spec)
            setRevolveStatus("open");
          } else {
            const next = Math.min(config.cadenceN, chargeRef.current + (settled - prev));
            setCharge(next);
            if (next >= config.cadenceN) setRevolveStatus("armed");
          }
        }
        lastSettledIndexRef.current = settled;
        // Report the settle decision with post-update charge/status so the HUD shows the
        // exact moment (and whether) a settled forward advance was counted.
        onDebugRef.current?.({
          type: "settle",
          settled,
          prev,
          charged: settled > prev,
          charge: chargeRef.current,
          status: statusRef.current,
        });
      }, SETTLE_MS);
    },
    [config.enabled, config.cadenceN, setCharge, setRevolveStatus],
  );

  const closeRevolve = useCallback(() => {
    if (statusRef.current !== "open") return;
    setRevolveStatus("closing");
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setRevolveStatus("idle");
    }, CLOSE_MS);
  }, [setRevolveStatus]);

  const resetCharge = useCallback(() => {
    setCharge(0);
    lastSettledIndexRef.current = latestIndexRef.current;
  }, [setCharge]);

  // Drop charge AND tear down the overlay if the flag is turned off at runtime (dev toggle).
  useEffect(() => {
    if (!config.enabled) {
      setCharge(0);
      setRevolveStatus("idle");
    }
  }, [config.enabled, setCharge, setRevolveStatus]);

  // Clear any pending timers on unmount.
  useEffect(
    () => () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  return { chargeCount, status, registerScrollIndex, closeRevolve, resetCharge };
}

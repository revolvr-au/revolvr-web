"use client";

import { useEffect, useState } from "react";

export type RingStatusResult = {
  ringTier: string;
  voltage: number;
  goldEligible: boolean;
  loggedIn: boolean;
  loading: boolean;
};

// Module-level cache so the fetch survives tab navigation (TabShell keeps components mounted)
let _cache: { data: RingStatusResult; ts: number } | null = null;
const CACHE_TTL = 60_000;

const INITIAL: RingStatusResult = {
  ringTier: "NONE",
  voltage: 0,
  goldEligible: false,
  loggedIn: false,
  loading: true,
};

export function useRingStatus(): RingStatusResult {
  const [status, setStatus] = useState<RingStatusResult>(() =>
    _cache ? { ..._cache.data, loading: false } : INITIAL,
  );

  useEffect(() => {
    if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
      setStatus({ ..._cache.data, loading: false });
      return;
    }
    fetch("/api/ring/status")
      .then((r) => r.json())
      .then((d) => {
        const result: RingStatusResult = {
          ringTier:     String(d.ringTier ?? "NONE"),
          voltage:      Number(d.voltage ?? 0),
          goldEligible: Boolean(d.goldEligible),
          loggedIn:     Boolean(d.loggedIn),
          loading:      false,
        };
        _cache = { data: result, ts: Date.now() };
        setStatus(result);
      })
      .catch(() => setStatus((p) => ({ ...p, loading: false })));
  }, []);

  return status;
}

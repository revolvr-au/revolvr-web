"use client";

import { useEffect, useMemo, useState } from "react";

type Tier = "blue" | "gold";
type VerifiedLookupResponse = { verified?: unknown; tiers?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function TickBadge({ tier }: { tier: Tier }) {
  const label = tier === "gold" ? "Gold verified creator" : "Verified creator";
  const bg = tier === "gold" ? "bg-yellow-400" : "bg-blue-500";
  const text = tier === "gold" ? "text-black" : "text-white";

  return (
    <span
      title={label}
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${bg} ${text} text-[10px] leading-none`}
      aria-label={label}
    >
      ✓
    </span>
  );
}

export function VerificationTick({ email }: { email: string | null | undefined }) {
  const normalizedEmail = useMemo(() => String(email || "").trim().toLowerCase(), [email]);
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!normalizedEmail) {
        setTier(null);
        return;
      }

      try {
        const res = await fetch(
          `/api/creator/verified?emails=${encodeURIComponent(normalizedEmail)}`,
          { cache: "no-store" }
        );

        const json = (await res.json().catch(() => null)) as VerifiedLookupResponse | null;

        const tiersRaw = isRecord(json) ? (json as any).tiers : null;
        const t = isRecord(tiersRaw) ? String((tiersRaw as any)[normalizedEmail] || "").toLowerCase() : "";

        const next: Tier | null = t === "gold" ? "gold" : t === "blue" ? "blue" : null;
        if (!cancelled) setTier(next);
      } catch {
        if (!cancelled) setTier(null);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [normalizedEmail]);

  if (!tier) return null;
  return <TickBadge tier={tier} />;
}

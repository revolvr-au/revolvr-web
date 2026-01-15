"use client";

import { useEffect, useMemo, useState } from "react";
import { VerificationTick } from "@/components/VerificationTick";

type Tier = "blue" | "gold";

export default function VerifiedName({
  email,
  name,
  className,
}: {
  email: string;
  name: string;
  className?: string;
}) {
  const normalizedEmail = useMemo(
    () => String(email || "").trim().toLowerCase(),
    [email]
  );

  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!normalizedEmail) {
          if (!cancelled) setTier(null);
          return;
        }

        const res = await fetch(
          `/api/creator/verified?emails=${encodeURIComponent(normalizedEmail)}`,
          { cache: "no-store" }
        );

        const json = (await res.json().catch(() => ({}))) as any;

        const tiers = json?.tiers && typeof json.tiers === "object" ? json.tiers : null;
        const t = tiers?.[normalizedEmail];

        const nextTier: Tier | null =
          t === "gold" ? "gold" : t === "blue" ? "blue" : null;

        if (!cancelled) setTier(nextTier);
      } catch (e) {
        console.error("[VerifiedName] failed", e);
        if (!cancelled) setTier(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedEmail]);

  // Avoid TS/signature mismatches if VerificationTick props differ slightly
  const Tick: any = VerificationTick;

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span>{name}</span>
      {tier ? <Tick tier={tier} /> : null}
    </span>
  );
}

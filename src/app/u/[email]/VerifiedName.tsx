"use client";

import { useEffect, useMemo, useState } from "react";

function VerifiedBadge({ tier }: { tier: "blue" | "gold" }) {
  return (
    <span
      title={tier === "gold" ? "Gold verified creator" : "Verified creator"}
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] ${
        tier === "gold" ? "bg-yellow-500" : "bg-blue-500"
      }`}
    >
      ✓
    </span>
  );
}

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

  const [tier, setTier] = useState<"blue" | "gold" | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!normalizedEmail) return;

      try {
        const res = await fetch(
          `/api/creator/verified?emails=${encodeURIComponent(normalizedEmail)}`,
          { cache: "no-store" }
        );
        const json = await res.json().catch(() => null);

        const tiers = json && typeof json === "object" ? (json as any).tiers : null;
        const t = tiers && typeof tiers === "object" ? (tiers as any)[normalizedEmail] : null;

        if (!cancelled) {
          setTier(t === "gold" || t === "blue" ? t : null);
        }
      } catch {
        if (!cancelled) setTier(null);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [normalizedEmail]);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span>{name}</span>
        {tier ? <VerifiedBadge tier={tier} /> : null}
      </div>
    </div>
  );
}

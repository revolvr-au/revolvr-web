"use client";

import { useEffect, useMemo, useState } from "react";

type Tier = "blue" | "gold";

function MiniTick({ tier }: { tier: Tier }) {
  const isGold = tier === "gold";
  return (
    <span
      className={[
        "inline-flex items-center gap-2",
        "text-[11px] px-2.5 py-1 rounded-full",
        "border",
        isGold
          ? "bg-yellow-500/20 border-yellow-300/40 text-yellow-100"
          : "bg-blue-500/20 border-blue-300/40 text-blue-100",
      ].join(" ")}
      title={isGold ? "Gold verified" : "Blue verified"}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 6L9 17l-5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-semibold">
        {isGold ? "GOLD VERIFIED" : "BLUE VERIFIED"}
      </span>
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

  const [tier, setTier] = useState<Tier | null>(null);
  const [debug, setDebug] = useState<string>("init");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!normalizedEmail) {
          if (!cancelled) {
            setTier(null);
            setDebug("no-email");
          }
          return;
        }

        const url = `/api/creator/verified?emails=${encodeURIComponent(normalizedEmail)}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as any;

        // Log everything so we can see the mismatch in DevTools
        console.log("[VerifiedName]", {
          inputEmail: email,
          normalizedEmail,
          url,
          json,
          tierKeys: json?.tiers ? Object.keys(json.tiers) : null,
        });

        const tiers =
          json?.tiers && typeof json.tiers === "object" ? json.tiers : null;

        const raw = tiers?.[normalizedEmail];
        const nextTier: Tier | null =
          raw === "gold" ? "gold" : raw === "blue" ? "blue" : null;

        if (!cancelled) {
          setTier(nextTier);
          setDebug(`raw=${String(raw)} keys=${String(Object.keys(tiers ?? {}).join(","))}`);
        }
      } catch (e) {
        console.error("[VerifiedName] fetch failed", e);
        if (!cancelled) {
          setTier(null);
          setDebug("fetch-failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedEmail, email]);

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span>{name}</span>

      {/* Always show something so “no tick” becomes impossible */}
      {tier ? (
        <MiniTick tier={tier} />
      ) : (
        <span className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-white/70">
          NO TICK ({debug})
        </span>
      )}
    </span>
  );
}

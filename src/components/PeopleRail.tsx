"use client";

import Image from "next/image";
import { useMemo } from "react";

export type VerificationTier = "blue" | "gold" | null;

export type PersonRailItem = {
  email: string;
  imageUrl?: string | null; // use post image as avatar for now
  isVerified?: boolean;
  verificationTier?: VerificationTier;
  href?: string; // optional override
};

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || email;
}

function Tick({ tier }: { tier: VerificationTier }) {
  const isGold = tier === "gold";
  const bg = isGold ? "bg-amber-400" : "bg-blue-500";
  const text = isGold ? "text-black" : "text-white";

  return (
    <span
      title={isGold ? "Gold verified creator" : "Verified creator"}
      className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ${bg} ${text} text-[10px] font-bold flex items-center justify-center shadow`}
      aria-label={isGold ? "Gold verified" : "Verified"}
    >
      ✓
    </span>
  );
}

export default function PeopleRail({
  title = "Featured creators",
  people,
}: {
  title?: string;
  people: PersonRailItem[];
}) {
  const cleaned = useMemo(() => {
    const uniq = new Map<string, PersonRailItem>();
    for (const p of people || []) {
      const email = String(p.email || "").trim().toLowerCase();
      if (!email) continue;
      if (!uniq.has(email)) uniq.set(email, { ...p, email });
    }
    return Array.from(uniq.values()).slice(0, 20);
  }, [people]);

  if (!cleaned.length) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-lg shadow-black/30">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] text-white/50">
          Tap a face to view
        </div>
      </div>

      {/* Joined squares: gap-0 and overflow-hidden prevents borders/lines */}
      <div className="w-full overflow-x-auto">
        <div className="flex gap-0">
          {cleaned.map((p) => {
            const href = p.href ?? `/u/${encodeURIComponent(p.email)}`;
            const tier = p.verificationTier ?? (p.isVerified ? "blue" : null);

            return (
              <a
                key={p.email}
                href={href}
                className="relative flex-none w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] bg-black/30"
                title={displayNameFromEmail(p.email)}
                aria-label={`View ${p.email}`}
              >
                {/* Avatar image */}
                {p.imageUrl ? (
                  <Image
                    src={p.imageUrl}
                    alt={p.email}
                    width={200}
                    height={200}
                    unoptimized
                    className="w-full h-full object-cover block"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/80">
                    {(p.email?.[0] ?? "R").toUpperCase()}
                  </div>
                )}

                {/* Subtle revolving ring overlay */}
                <span className="pointer-events-none absolute inset-1 rounded-md">
                  <span className="absolute inset-0 rounded-md rv-revolve-ring opacity-60" />
                  <span className="absolute inset-0 rounded-md border border-white/10" />
                </span>

                {/* Verified tick */}
                {tier ? <Tick tier={tier} /> : null}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

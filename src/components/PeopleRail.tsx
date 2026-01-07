// src/components/PeopleRail.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";

export type PersonRailItem = {
  email: string;
  imageUrl?: string | null;
  displayName?: string | null;
  tick?: "blue" | "gold" | null;
};

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || email;
}

function Tick({ tick }: { tick: "blue" | "gold" }) {
  const bg = tick === "gold" ? "bg-amber-400" : "bg-blue-500";
  return (
    <span
      title={tick === "gold" ? "Gold tick" : "Blue tick"}
      className={`absolute right-1 top-1 z-10 inline-flex h-4 w-4 items-center justify-center rounded-full ${bg} text-[10px] font-bold text-black shadow`}
      aria-label={tick === "gold" ? "Gold tick" : "Blue tick"}
    >
      ✓
    </span>
  );
}

export default function PeopleRail({
  title = "Featured",
  hint = "Tap a face to view",
  items,
  size = 74,
  revolve = true,
}: {
  title?: string;
  hint?: string;
  items: PersonRailItem[];
  size?: number;
  revolve?: boolean;
}) {
  const normalized = useMemo(() => {
    if (!items?.length) return [];
    return items
      .map((p) => {
        const email = String(p.email || "").trim().toLowerCase();
        if (!email) return null;
        const name = p.displayName || displayNameFromEmail(email);
        return { ...p, email, displayName: name };
      })
      .filter(Boolean) as Array<PersonRailItem & { email: string; displayName: string }>;
  }, [items]);

  const [broken, setBroken] = useState<Record<string, true>>({});

  if (!normalized.length) return null;

  return (
    <section className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-white/50">{hint}</div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="flex gap-[1px] bg-white/10 rounded-xl overflow-hidden">
            {normalized.map((p) => {
              const email = p.email;
              const name = p.displayName || displayNameFromEmail(email);

              const showImage = Boolean(p.imageUrl) && !broken[email];

              return (
                <Link
                  key={email}
                  href={`/u/${encodeURIComponent(email)}`}
                  className="relative flex-none bg-[#050814]"
                  style={{ width: size, height: size }}
                  aria-label={`View ${name}`}
                  title={name}
                >
                  {p.tick ? <Tick tick={p.tick} /> : null}

                  <div className={`relative w-full h-full overflow-hidden ${revolve ? "rv-revolve-tile" : ""}`}>
                    {showImage ? (
                      <SafeImage
                        src={p.imageUrl as string}
                        alt={name}
                        fill
                        unoptimized
                        className="object-cover"
                        onError={() => setBroken((prev) => ({ ...prev, [email]: true }))}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-white/60 bg-white/5">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-white/5" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

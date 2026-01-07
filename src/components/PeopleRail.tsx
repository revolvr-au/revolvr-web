// src/components/PeopleRail.tsx
"use client";

import { useMemo } from "react";
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
  items,
  size = 74,
  revolve = true,
}: {
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

  if (!normalized.length) return null;

  return (
    <div className="w-full">
      <div
        className="flex items-center overflow-x-auto no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex gap-3">
          {normalized.map((p) => {
            const email = p.email;
            const name = p.displayName;

            return (
              <Link
                key={email}
                href={`/u/${encodeURIComponent(email)}`}
                className="relative flex-none"
                style={{ width: size, height: size }}
                aria-label={`View ${name}`}
                title={name}
              >
                {p.tick ? <Tick tick={p.tick} /> : null}

                <div
                  className={`relative w-full h-full overflow-hidden rounded-2xl ${
                    revolve ? "rv-revolve-tile" : ""
                  }`}
                >
                  {p.imageUrl ? (
                    <SafeImage
                      src={p.imageUrl}
                      alt={name}
                      width={size}
                      height={size}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-white/70 bg-white/5 rounded-2xl">
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

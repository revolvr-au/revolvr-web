// src/components/PeopleRail.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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
      className={`absolute right-0 top-0 z-10 inline-flex h-4 w-4 items-center justify-center rounded-full ${bg} text-[10px] font-bold text-black shadow`}
      aria-label={tick === "gold" ? "Gold tick" : "Blue tick"}
    >
      ✓
    </span>
  );
}

function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u) return false;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/");
}

export default function PeopleRail({
  items,
  size = 72,
}: {
  items: PersonRailItem[];
  size?: number;
}) {
  const normalized = useMemo(() => {
    if (!items?.length) return [];
    return items
      .map((p) => {
        const email = String(p.email || "").trim().toLowerCase();
        if (!email) return null;
        const name = p.displayName || displayNameFromEmail(email);
        return {
          ...p,
          email,
          displayName: name,
          imageUrl: isValidImageUrl(p.imageUrl) ? p.imageUrl : null,
        };
      })
      .filter(Boolean) as Array<PersonRailItem & { email: string; displayName: string }>;
  }, [items]);

  const [broken, setBroken] = useState<Record<string, true>>({});

  if (!normalized.length) return null;

  return (
    <div className="px-4">
      <div
        className="flex items-center overflow-x-auto no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex gap-3 py-2">
          {normalized.map((p) => {
            const email = p.email;
            const name = p.displayName;
            const showImage = Boolean(p.imageUrl) && !broken[email];

            return (
              <Link
                key={email}
                href={`/u/${encodeURIComponent(email)}`}
                className="relative flex-none rounded-full overflow-hidden bg-white/5 rv-avatar"
                style={{ width: size, height: size }}
                aria-label={`View ${name}`}
                title={name}
              >
                {p.tick ? <Tick tick={p.tick} /> : null}

                <div className="relative w-full h-full">
                  {showImage ? (
                    <Image
                      src={p.imageUrl as string}
                      alt={name}
                      fill
                      unoptimized
                      className="object-cover"
                      onError={() => setBroken((prev) => ({ ...prev, [email]: true }))}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-white/60">
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>

                <span className="absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity bg-white/5" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

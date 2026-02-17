// src/components/PeopleRail.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type PersonRailItem = {
  id: string;          // stable identifier
  handle: string;      // public handle
  imageUrl?: string | null;
  displayName?: string | null;
  tick?: "blue" | "gold" | null;
  isLive?: boolean | null;
};

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || "User";
}


function LivePill() {
  return (
    <span
      title="LIVE"
      className={[
        "absolute -left-2 -top-2 z-20",
        "inline-flex items-center gap-1",
        "h-5 px-2",
        "rounded-full",
        "bg-red-500/90 text-white",
        "text-[10px] font-bold tracking-wide",
        "shadow ring-2 ring-black/30",
        "backdrop-blur",
      ].join(" ")}
      aria-label="Live"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
      LIVE
    </span>
  );
}

function Tick({ tick }: { tick: "blue" | "gold" }) {
  const bg = tick === "gold" ? "bg-amber-400" : "bg-blue-500";
  return (
    <span
      title={tick === "gold" ? "Gold tick" : "Blue tick"}
      className={[
        "absolute -right-2 -top-2 z-20",
        "inline-flex h-[18px] w-[18px] items-center justify-center",
        "rounded-full",
        bg,
        "text-[10px] font-bold text-black",
        "shadow ring-2 ring-black/30",
      ].join(" ")}
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
          isLive: Boolean(p.isLive),
        };
      })
      .filter(Boolean) as Array<
      PersonRailItem & { email: string; displayName: string; isLive: boolean }
    >;
  }, [items]);

  const [broken, setBroken] = useState<Record<string, true>>({});

  if (!normalized.length) return null;

  return (
    <div className="px-4">
      <div
        className="flex items-center overflow-x-auto no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex gap-4 py-2">
          {normalized.map((p) => {
            const email = p.email;
            const name = p.displayName;
            const showImage = Boolean(p.imageUrl) && !broken[email];

            return (
              <Link
                key={email}
                href={`/u/${encodeURIComponent(name.toLowerCase())}`}
                className="flex-none"
                aria-label={`View ${name}`}
                title={name}
              >
                <div className="flex flex-col items-center gap-2">
                  {/* OUTER box allows badges to hang outside */}
                  <div
                    className="relative overflow-visible"
                    style={{ width: size, height: size }}
                  >
                    {p.isLive ? <LivePill /> : null}
                    {p.tick ? <Tick tick={p.tick} /> : null}

                    {/* Inner wrapper clips image + premium ring */}
                    <div className="rv-avatar relative w-full h-full rounded-full overflow-hidden bg-white/5">
                      <div className="relative w-full h-full">
                        {showImage ? (
                          <Image
                            src={p.imageUrl as string}
                            alt={name}
                            fill
                            unoptimized
                            className="object-cover"
                            onError={() =>
                              setBroken((prev) => ({ ...prev, [email]: true }))
                            }
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-white/60">
                            {name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <span className="absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity bg-white/5" />
                    </div>
                  </div>

                  {/* Label under avatar */}
                  <div className="text-[13px] font-medium text-white/80 max-w-[96px] truncate">
                    {name}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

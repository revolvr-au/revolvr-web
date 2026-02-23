"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { displayNameFromEmail, isValidImageUrl } from "@/utils/imageUtils";

export type PersonRailItem = {
  id: string;
  email: string;
  handle: string;
  imageUrl?: string | null;
  displayName?: string | null;
  tick?: "blue" | "gold" | null;
  isLive?: boolean | null;
};

type Props = {
  items: PersonRailItem[];
  size?: number;
  onToggleFollow?: (email: string) => void;
  followMap?: Record<string, boolean>;
  followBusy?: Record<string, boolean>;
};

function LivePill() {
  return (
    <span className="absolute -left-2 -top-2 z-20 h-5 px-2 rounded-full bg-red-500 text-white text-[10px] font-bold shadow ring-2 ring-black/30">
      LIVE
    </span>
  );
}

function Tick({ tick }: { tick: "blue" | "gold" }) {
  const bg = tick === "gold" ? "bg-amber-400" : "bg-blue-500";
  return (
    <span
      className={`absolute -right-2 -top-2 z-20 h-[18px] w-[18px] flex items-center justify-center rounded-full ${bg} text-[10px] font-bold text-black shadow ring-2 ring-black/30`}
    >
      ✓
    </span>
  );
}

export default function PeopleRail({
  items,
  size = 72,
  onToggleFollow,
  followMap = {},
  followBusy = {},
}: Props) {
  const normalized = useMemo(() => {
    return items
      .map((p) => {
        const email = String(p.email || "").trim().toLowerCase();
        if (!email) return null;

        return {
          ...p,
          email,
          displayName: p.displayName || displayNameFromEmail(email),
          imageUrl: isValidImageUrl(p.imageUrl) ? p.imageUrl : null,
          isLive: Boolean(p.isLive),
        };
      })
      .filter(Boolean) as Array<
      PersonRailItem & { displayName: string; isLive: boolean }
    >;
  }, [items]);

  const [broken, setBroken] = useState<Record<string, true>>({});

  if (!normalized.length) return null;

  return (
    <div className="px-4">
      <div className="flex items-center overflow-x-auto no-scrollbar">
        <div className="flex gap-4 py-2">
          {normalized.map((p) => {
            const id = p.id;
            const name = p.displayName;
            const showImage = Boolean(p.imageUrl) && !broken[id];
            const isFollowing = followMap[p.email];

            return (
              <div key={id} className="flex-none flex flex-col items-center gap-2">
                <Link
                  href={`/u/${encodeURIComponent(p.handle)}`}
                  aria-label={`View ${name}`}
                >
                  <div
                    className="relative overflow-visible"
                    style={{ width: size, height: size }}
                  >
                    {p.isLive && <LivePill />}
                    {p.tick && <Tick tick={p.tick} />}

                    <div
  className={`
    relative w-full h-full rounded-full overflow-hidden
    ${p.isLive
      ? "ring-2 ring-red-500 shadow-[0_0_35px_rgba(255,0,85,0.7)]"
      : "bg-white/5"}
  `}
>
  {p.isLive && (
    <div className="absolute inset-0 rounded-full ring-4 ring-red-500/30 animate-ping pointer-events-none" />
  )}
                      {showImage ? (
                        <Image
                          src={p.imageUrl as string}
                          alt={name}
                          fill
                          unoptimized
                          className="object-cover"
                          onError={() =>
                            setBroken((prev) => ({ ...prev, [id]: true }))
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-white/60">
                          {name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="text-[13px] font-medium text-white/80 max-w-[96px] truncate">
                  {name}
                </div>

                {onToggleFollow && (
                  <button
                    type="button"
                    disabled={followBusy[p.email]}
                    onClick={() => onToggleFollow(p.email)}
                    className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50"
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

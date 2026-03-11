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

export default function PeopleRail({
  items,
  size = 72,
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
        };
      })
      .filter(Boolean) as Array<PersonRailItem & { displayName: string }>;
  }, [items]);

  const [broken, setBroken] = useState<Record<string, true>>({});

  if (!normalized.length) return null;

  return (
    <div className="absolute top-[92px] left-0 right-0 z-40 px-4 py-3 overflow-x-auto no-scrollbar bg-transparent pointer-events-none">
      <div className="flex gap-4 pointer-events-auto">

        {normalized.map((p) => {
          const id = p.id;
          const name = p.displayName;
          const showImage = Boolean(p.imageUrl) && !broken[id];

          return (
            <Link
              key={id}
              href={`/u/${encodeURIComponent(p.handle)}`}
              className="flex flex-col items-center flex-none gap-2"
            >
              <div
                className="relative rounded-full overflow-hidden bg-white/5"
                style={{ width: size, height: size }}
              >
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

              <div className="text-[12px] text-white/80 max-w-[80px] truncate">
                {name}
              </div>
            </Link>
          );
        })}

      </div>
    </div>
  );
}
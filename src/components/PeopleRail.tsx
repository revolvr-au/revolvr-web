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
};

type Props = {
  items: PersonRailItem[];
  size?: number;
};

export default function PeopleRail({ items, size = 72 }: Props) {
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

  if (!normalized.length) {
    return (
      <div className="w-full py-3 px-4 text-white/40 text-sm border-b border-white/10">
        No creators yet
      </div>
    );
  }

  return (
    <div className="relative w-full py-3 overflow-x-auto no-scrollbar bg-transparent border-b border-white/10">
      <div className="flex gap-4 px-4">
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
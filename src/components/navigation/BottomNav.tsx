"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Home, Plus, User } from "lucide-react";
import { createSupabaseBrowserClient } from "@/supabase-browser";

function TrancheIcon({ className }: { className?: string }) {
  // B1 breakout icon — circle with a diagonal line escaping to a filled dot
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="9" cy="15" r="6" />
      <line x1="13.24" y1="10.76" x2="19" y2="5" />
      <circle cx="20" cy="4" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

const NAV_ITEMS = [
  { icon: Home, path: "/feed" },
  { icon: Plus, path: "/create" },
  { icon: TrancheIcon, path: "/tranche" },
  { icon: User, path: "/me" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasUnreadTranche, setHasUnreadTranche] = useState(false);

  const foundIndex = NAV_ITEMS.findIndex((item) =>
    pathname.startsWith(item.path)
  );
  const activeIndex = foundIndex === -1 ? 0 : foundIndex;

  useEffect(() => {
    let cancelled = false;

    async function checkUnread() {
      const sb = createSupabaseBrowserClient();
      const { data } = await sb.auth.getUser();
      const email = data.user?.email;
      if (!email) {
        if (!cancelled) setHasUnreadTranche(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/tranche/unread-count?viewerEmail=${encodeURIComponent(email)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!cancelled) setHasUnreadTranche(Boolean(json?.ok && json.count > 0));
      } catch {
        if (!cancelled) setHasUnreadTranche(false);
      }
    }

    checkUnread();
    const id = setInterval(checkUnread, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pathname]);

  const slotPercent = 100 / NAV_ITEMS.length;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50">
      {/* Top fade gradient */}
      <div className="absolute -top-8 h-8 w-full bg-gradient-to-t from-[#050814] to-transparent pointer-events-none" />

      <div className="relative backdrop-blur-md bg-white/10 border-t border-white/10">
        <div className="relative flex justify-around items-center py-3">

          {/* Sliding Pill */}
          <motion.div
            layout
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 36,
              mass: 0.8,
            }}
            className="absolute h-10 w-16 rounded-xl bg-white/10"
            style={{
              left: `calc(${activeIndex * slotPercent}% + ${slotPercent / 2}% - 32px)`,
            }}
          />

          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;
            const showDot = item.path === "/tranche" && hasUnreadTranche;

            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="relative z-10 flex items-center justify-center w-16 h-10"
              >
                <Icon
                  className={`w-6 h-6 transition-all duration-200 ${
                    isActive ? "text-white" : "text-white/50"
                  }`}
                />
                {showDot && (
                  <span
                    className="absolute top-1 right-3 w-2 h-2 rounded-full bg-amber-400"
                    style={{ boxShadow: "0 0 6px rgba(251,191,36,0.8)" }}
                    aria-label="Unread tranche notifications"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

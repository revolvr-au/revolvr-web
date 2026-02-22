"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Plus, User } from "lucide-react";

const NAV_ITEMS = [
  { icon: Home, path: "/feed" },
  { icon: Plus, path: "/create" },
  { icon: User, path: "/me" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const foundIndex = NAV_ITEMS.findIndex((item) =>
    pathname.startsWith(item.path)
  );
  const activeIndex = foundIndex === -1 ? 0 : foundIndex;

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
              left: `calc(${activeIndex * 33.333}% + 16.66% - 32px)`,
            }}
          />

          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;

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
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

/**
 * Keep this in sync with the layout padding-bottom so content never hides behind the bar.
 * If you change BAR_HEIGHT, update the layout padding too.
 */
export const BAR_HEIGHT_PX = 56;

export type BottomBarTab = {
  key: string;
  label: string;
  href: string;
  matchPrefix?: string | string[];
};


export type BottomBarProps = {
  /**
   * Use this to hide the bar on modal/fullscreen views.
   */
  hidden?: boolean;

  /**
   * Override tabs if needed. Defaults are reasonable placeholders.
   */
  tabs?: BottomBarTab[];

  /**
   * If true, the bar renders above the safe area with extra padding.
   * (We also apply env(safe-area-inset-bottom) regardless; this flag is here if you want to tweak later.)
   */
  safeArea?: boolean;
};

const defaultTabs: BottomBarTab[] = [
  // /feed redirects to /public-feed; make /public-feed canonical but keep /feed as active too
  {
    key: "feed",
    label: "Feed",
    href: "/public-feed",
    matchPrefix: ["/public-feed", "/feed"],
  },

  // Live should highlight for /live and /live/[sessionId]
  { key: "live", label: "Live", href: "/live", matchPrefix: "/live" },

  { key: "credits", label: "Credits", href: "/credits", matchPrefix: "/credits" },
];




function isActive(pathname: string, tab: BottomBarTab) {
  const prefixes = tab.matchPrefix
    ? Array.isArray(tab.matchPrefix)
      ? tab.matchPrefix
      : [tab.matchPrefix]
    : [tab.href];

  return prefixes.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });
}


function Icon({
  name,
  active,
}: {
  name: "feed" | "live" | "create" | "credits" | "profile";
  active: boolean;
}) {
  // Minimal inline SVGs so you’re not dependent on any icon packages.
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className: active ? "opacity-100" : "opacity-80",
  };

  switch (name) {
    case "feed":
      return (
        <svg {...common}>
          <path
            d="M6 7h12M6 12h12M6 17h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "live":
      return (
        <svg {...common}>
          <path
            d="M10 8l6 4-6 4V8z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 9.5c-1 1.5-1 3.5 0 5M19.5 9.5c1 1.5 1 3.5 0 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "create":
      return (
        <svg {...common}>
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "credits":
      return (
        <svg {...common}>
          <path
            d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7H15a3.5 3.5 0 0 1 0 7H7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <path
            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M4 21a8 8 0 0 1 16 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export default function BottomBar({
  hidden = false,
  tabs = defaultTabs,
  safeArea = true,
}: BottomBarProps) {
  const pathname = usePathname() || "/";

  if (hidden) return null;

  return (
    <nav
      aria-label="Bottom navigation"
      className={[
        "fixed inset-x-0 bottom-0 z-50",
        "border-t border-black/10 dark:border-white/10",
        "bg-white/90 dark:bg-black/70 backdrop-blur",
      ].join(" ")}
      style={{
        height: BAR_HEIGHT_PX,
        paddingBottom: safeArea ? "env(safe-area-inset-bottom)" : undefined,
      }}
    >
      <div className="mx-auto flex h-full max-w-screen-sm items-center justify-around px-2">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab);
          const iconName =
            tab.key === "feed" ||
            tab.key === "live" ||
            tab.key === "create" ||
            tab.key === "credits" ||
            tab.key === "profile"
              ? (tab.key as any)
              : undefined;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={[
                "flex min-w-[56px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1",
                active
                  ? "text-black dark:text-white"
                  : "text-black/60 dark:text-white/70",
                "hover:text-black dark:hover:text-white",
                "focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              {iconName ? (
                <Icon name={iconName} active={active} />
              ) : (
                <span
                  className={[
                    "h-[22px] w-[22px] rounded",
                    active ? "bg-black/10 dark:bg-white/10" : "bg-transparent",
                  ].join(" ")}
                />
              )}
              <span className="text-[11px] leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

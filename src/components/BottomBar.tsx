"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

/**
 * Keep this in sync with the layout padding-bottom so content never hides behind the bar.
 * If you change BAR_HEIGHT, update the layout padding too.
 */
export const BAR_HEIGHT_PX = 56;

export type BottomBarTab = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
  matchPrefix?: string | string[];
};

export type BottomBarProps = {
  hidden?: boolean;
  tabs?: BottomBarTab[];
  safeArea?: boolean;
};

// IMPORTANT: set this to your actual built profile route if it's not /profile
const PROFILE_ROUTE = "/creator";

const defaultTabs: BottomBarTab[] = [
  {
    key: "feed",
    label: "Feed",
    href: "/public-feed",
    matchPrefix: ["/public-feed", "/feed"],
  },
  {
    key: "create",
    label: "+",
    // We'll route client-side without a full reload
    onClick: () => {},
    matchPrefix: "/create",
  },
  {
    key: "command",
    label: "Command",
    href: PROFILE_ROUTE,
    matchPrefix: PROFILE_ROUTE,
  },
];

function isActive(pathname: string, tab: BottomBarTab) {
  const prefixes = tab.matchPrefix
    ? Array.isArray(tab.matchPrefix)
      ? tab.matchPrefix
      : [tab.matchPrefix]
    : tab.href
      ? [tab.href]
      : [];

  return prefixes.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });
}

function Icon({
  name,
  active,
}: {
  name: "feed" | "create" | "command";
  active: boolean;
}) {
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
    case "command":
      // "Command" icon: simple dial/gear-ish mark (neutral, not "profile")
      return (
        <svg {...common}>
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M19.4 15a8 8 0 0 0 .1-6M4.5 9a8 8 0 0 0 0 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 2v2M12 20v2M2 12h2M20 12h2"
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
  const router = useRouter();

  if (hidden) return null;

  // Wire the create action client-side
  const resolvedTabs = React.useMemo(() => {
    return tabs.map((t) => {
      if (t.key !== "create") return t;
      return {
        ...t,
        onClick:
          t.onClick ??
          (() => {
            router.push("/create");
          }),
      };
    });
  }, [tabs, router]);

  return (
    <nav
      aria-label="Bottom navigation"
      className={[
        "fixed inset-x-0 bottom-0 z-50",
        "border-t border-white/10",
        "bg-[#050814]/90 backdrop-blur",
      ].join(" ")}
      style={{
        height: BAR_HEIGHT_PX,
        paddingBottom: safeArea ? "env(safe-area-inset-bottom)" : undefined,
      }}
    >
      <div className="mx-auto flex h-full max-w-screen-sm items-center justify-around px-2">
        {resolvedTabs.map((tab) => {
          const active = isActive(pathname, tab);

          const baseClasses = [
            "flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1",
            active ? "text-white" : "text-white/70",
            "hover:text-white",
            "focus:outline-none focus:ring-2 focus:ring-white/20",
          ].join(" ");

          // Create (action tab)
          if (!tab.href && tab.onClick) {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={tab.onClick}
                className={baseClasses}
                aria-current={active ? "page" : undefined}
              >
                <Icon name="create" active={active} />
                <span className="text-[11px] leading-none">{tab.label}</span>
              </button>
            );
          }

          // Normal link tab
          return (
            <Link
              key={tab.key}
              href={tab.href!}
              className={baseClasses}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                name={
                  tab.key === "feed"
                    ? "feed"
                    : tab.key === "command"
                      ? "command"
                      : "feed"
                }
                active={active}
              />
              <span className="text-[11px] leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { supabase } from "@/lib/supabaseClients";

const BAR_HEIGHT_PX = 72;

/**
 * Keep this in sync with layout padding-bottom
 */

function isActive(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });
}

function Icon({
  name,
  active,
}: {
  name: "home" | "create" | "profile";
  active?: boolean;
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
    case "home":
      return (
        <svg {...common}>
          <path
            d="M4 11L12 4l8 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 10v9h12v-9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "create":
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case "profile":
      return (
        <svg {...common}>
          <path
            d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export default function BottomBar({
  hidden = false,
  safeArea = true,
}: {
  hidden?: boolean;
  safeArea?: boolean;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  if (hidden) return null;

  const homeActive = isActive(pathname, ["/public-feed", "/feed"]);
  const profileActive = isActive(pathname, ["/u", "/me", "/command"]);

  const baseClasses = (active: boolean) =>
    [
      "flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 transition",
      active ? "text-white scale-105" : "text-white/60",
      "hover:text-white",
      "focus:outline-none focus:ring-2 focus:ring-white/20",
    ].join(" ");

  const handleCreate = () => {
    router.push("/create");
  };

  const handleProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      router.push("/command");
      return;
    }

    router.push("/me");
  };

  return (
    <nav
  aria-label="Bottom navigation"
  className="fixed inset-x-0 bottom-0 z-50 bg-[#050814]/60 backdrop-blur-xl"
  style={{
    height: BAR_HEIGHT_PX,
    paddingBottom: safeArea ? "env(safe-area-inset-bottom)" : undefined,
  }}
>
      <div className="mx-auto flex h-full max-w-screen-sm items-center justify-between px-6">
        {/* HOME */}
        <Link
          href="/public-feed"
          className={baseClasses(homeActive)}
          aria-current={homeActive ? "page" : undefined}
        >
          <Icon name="home" active={homeActive} />
          <span className="text-[11px] leading-none">Home</span>
        </Link>

        {/* CREATE (Primary Action) */}
        <button
          type="button"
          onClick={handleCreate}
          className="flex items-center justify-center text-white transition hover:scale-110"
        >
          <Icon name="create" />
        </button>

        {/* PROFILE */}
        <button
          type="button"
          onClick={handleProfile}
          className={baseClasses(profileActive)}
          aria-current={profileActive ? "page" : undefined}
        >
          <Icon name="profile" active={profileActive} />
          <span className="text-[11px] leading-none">Profile</span>
        </button>
      </div>
    </nav>
  );
}
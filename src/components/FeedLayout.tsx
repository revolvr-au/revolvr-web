"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Home, User, Plus, Radio, Broadcast } from "lucide-react";

import BottomBar from "@/components/BottomBar";
import PeopleRail from "@/components/peoplerail/PeopleRail";

import { useState, useRef } from "react";

type Props = {
  children: ReactNode;
  title?: string;
  right?: ReactNode;
  onGoLive?: () => void;
  showMenu?: boolean;
  menuHref?: string;
  isLive?: boolean;
  activePost?: string | null;
  railUsers?: any[];
  onSelectCreator?: (id: string) => void;
};

export default function FeedLayout({
  children,
  title,
  right,
  onGoLive,
  showMenu = false,
  menuHref = "/command",
  isLive = false,
  activePost,
  railUsers,
  onSelectCreator
}: Props) {

  const [peopleOpen, setPeopleOpen] = useState(false);
  const swipeStart = useRef(0);

  return (
    <div className="min-h-screen text-white flex flex-col">

      {!isLive && (
        <header className="fixed top-0 left-0 right-0 z-[999] px-4 pt-[env(safe-area-inset-top)]">
  <div className="flex w-full max-w-[720px] mx-auto items-center justify-between gap-3 px-4 py-3">

    {/* LEFT: LOGO */}
    <div className="min-w-0">
      <h1 className="text-xl font-semibold tracking-wider text-white">
        {(title ?? "REVOLVR").toUpperCase()}
      </h1>
    </div>

    {/* RIGHT */}
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onGoLive?.()}
        disabled={!onGoLive}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-95 ${
          isLive
            ? "bg-red-600 shadow-[0_0_20px_rgba(255,0,60,0.6)]"
            : "bg-white/10 backdrop-blur"
        }`}
      >
        <Radio className="w-5 h-5 text-white" />
        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      </button>

      {right ?? null}

      {showMenu && (
        <Link
          href={menuHref}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur"
        >
          ☰
        </Link>
      )}
    </div>

  </div>
</header>
      )}

    <main
  className="flex-1 pb-4 relative"
  style={{ background: "rgba(255,0,0,0.2)" }}
  onTouchStart={(e) => {
    const target = e.target as HTMLElement;

    // ✅ ignore taps on posts
    if (target.closest("[data-postid]")) return;

    const x = e.touches[0].clientX;
    const width = window.innerWidth;

    if (x > width - 80) {
      swipeStart.current = -1;
      return;
    }

    swipeStart.current = x;
  }}
  onTouchEnd={(e) => {
    if (swipeStart.current === -1) return;

    const endX = e.changedTouches[0].clientX;
    const diff = endX - swipeStart.current;

    const startedAtLeftEdge = swipeStart.current < 70;

    if (!peopleOpen) {
      if (!startedAtLeftEdge) return;

      if (diff > 60) {
        setPeopleOpen(true);
      }
      return;
    }

    if (peopleOpen && diff < -60) {
      setPeopleOpen(false);
    }
  }}
>
{children}

</main>

{!isLive && <BottomBar />}

</div>
);
}
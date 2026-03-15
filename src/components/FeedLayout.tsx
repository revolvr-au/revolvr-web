"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Radio } from "lucide-react";
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
        <header className="absolute top-[64px] left-0 right-0 z-50 px-4">
          <div className="flex w-full max-w-[720px] items-center justify-between gap-3 px-4 py-3">

            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-wider bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                {(title ?? "REVOLVR").toUpperCase()}
              </h1>
            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() => onGoLive?.()}
                disabled={!onGoLive}
                className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-95 ${
                  isLive
                    ? "bg-red-600 shadow-[0_0_20px_rgba(255,0,60,0.6)]"
                    : "bg-white/5 hover:bg-white/10"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Radio className="w-5 h-5 text-white" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </button>

              {right ?? null}

              {showMenu && (
                <Link
                  href={menuHref}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition hover:bg-white/10 active:scale-95"
                >
                  ☰
                </Link>
              )}
            </div>

          </div>
        </header>
      )}

     <main
  className="flex-1 pb-20 relative"
  
  onTouchStart={(e) => {
    swipeStart.current = e.touches[0].clientX;
  }}

  onTouchEnd={(e) => {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - swipeStart.current;

    const startedAtLeftEdge = swipeStart.current < 50;

    // open rail (only if swipe starts from left edge)
    if (!peopleOpen && startedAtLeftEdge && diff > 60) {
      setPeopleOpen(true);
      return;
    }

    // close rail (only if rail already open)
    if (peopleOpen && diff < -60) {
      setPeopleOpen(false);
    }
  }}
>

  <PeopleRail
    open={peopleOpen}
    userId="test-user"
    activePost={activePost}
    users={railUsers}
    onSelectCreator={onSelectCreator}
  />

  {children}

</main>

{!isLive && <BottomBar />}

</div>
);
}
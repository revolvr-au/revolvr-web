"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Radio } from "lucide-react";
import { useGoLive } from "@/hooks/useGoLive";

export default function FeedLayout({
  children,
  title,
  right,
  showMenu = false,
  menuHref = "/command",
}: {
  children: ReactNode;
  title?: string;
  right?: ReactNode;
  showMenu?: boolean;
  menuHref?: string;
}) {
  const goLive = useGoLive();

  return (
    <div className="min-h-screen bg-[#050814] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-3 px-4 py-3">

          {/* Brand */}
          <div className="min-w-0">
            <h1 className="
              text-xl font-semibold tracking-wider
              bg-gradient-to-r from-white via-white/90 to-white/60
              bg-clip-text text-transparent
            ">
              {title ?? "REVOLVR"}
            </h1>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-2">

            {/* Go Live Icon */}
            <button
              onClick={goLive}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition hover:bg-white/10"
              aria-label="Go Live"
            >
              <Radio className="w-5 h-5 text-white" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>

            {right ?? null}

            {showMenu ? (
              <Link
                href={menuHref}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition hover:bg-white/10"
                aria-label="Menu"
                title="Menu"
              >
                ☰
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-6">
        <div className="mx-auto w-full max-w-[720px]">
          {children}
        </div>
      </main>
    </div>
  );
}
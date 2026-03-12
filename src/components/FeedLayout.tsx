"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Radio } from "lucide-react";
import BottomBar from "@/components/BottomBar";

type Props = {
  children: ReactNode;
  title?: string;
  right?: ReactNode;
  onGoLive?: () => void;
  showMenu?: boolean;
  menuHref?: string;
  isLive?: boolean;
};

export default function FeedLayout({
  children,
  title,
  right,
  onGoLive,
  showMenu = false,
  menuHref = "/command",
  isLive = false,
}: Props) {
  return (
    <div className="min-h-screen text-white flex flex-col">

      {!isLive && (
  <header
  className="absolute top-0 left-0 right-0 z-50 px-4 pt-28"
  style={{ paddingTop: "env(safe-area-inset-top)" }}
>
          <div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-3 px-4 py-3">

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
                aria-label="Go Live"
              >
                <Radio className="w-5 h-5 text-white" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </button>

              {right ?? null}

              {showMenu && (
                <Link
                  href={menuHref}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition hover:bg-white/10 active:scale-95"
                  aria-label="Menu"
                >
                  ☰
                </Link>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 w-full pb-20">
        {children}
      </main>

      {!isLive && <BottomBar />}

    </div>
  );
}
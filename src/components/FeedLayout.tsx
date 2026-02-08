"use client";

import type { ReactNode } from "react";

export default function FeedLayout({
  children,
  title,
  subtitle,
  right,
  showMenu = false,
  onMenuClick,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  showMenu?: boolean;
  onMenuClick?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#050814] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
              {title ?? "Revolvr"}
            </h1>
            <p className="text-[11px] text-white/45">{subtitle ?? "Public feed"}</p>
          </div>

          <div className="flex items-center gap-2">
            {right ?? null}

            {showMenu ? (
  <button
    type="button"
    onClick={onMenuClick ?? undefined}
    ...
  >
    ☰
  </button>
) : null}

          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

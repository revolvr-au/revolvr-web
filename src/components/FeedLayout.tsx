"use client";

import type { ReactNode } from "react";

type FeedLayoutProps = {
  children: ReactNode;
  title?: string;
  right?: ReactNode;
};

export default function FeedLayout({
  children,
  title = "Revolvr",
  right,
}: FeedLayoutProps) {
  return (
    <div className="min-h-screen bg-[#050814] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate">
              {title}
            </h1>
            <p className="text-[11px] text-white/50">Public feed</p>
          </div>

          {right ? <div className="flex items-center gap-2">{right}</div> : null}
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}

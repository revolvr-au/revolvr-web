"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export default function FeedLayout({
  children,
  title,
  subtitle,
  right,
  showMenu = false,
  menuHref = "/command",
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  showMenu?: boolean;
  menuHref?: string;
}) {
  return (
    <div className="min-h-screen bg-[#050814] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
              {title ?? "Revolvr"}
            </h1>
            <p className="text-[11px] text-white/45">{subtitle ?? "Public feed"}</p>
          </div>

          <div className="flex items-center gap-2">
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

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

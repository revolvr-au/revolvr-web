"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import MenuSheet from "@/components/MenuSheet";

function MenuItem({
  children,
  onClick,
  subtle,
}: {
  children: ReactNode;
  onClick?: () => void;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition",
        subtle
          ? "text-white/70 hover:bg-white/5"
          : "text-white/90 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function FeedLayout({
  children,
  title,
  subtitle,
  right,
  showMenu = false,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  showMenu?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const canShowMenu = useMemo(() => !!showMenu, [showMenu]);

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

            {canShowMenu ? (
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition hover:bg-white/10"
                aria-label="Menu"
                title="Menu"
              >
                ☰
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>

      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Revolvr">
        <div className="space-y-1">
          <MenuItem onClick={() => setMenuOpen(false)}>Account</MenuItem>
          <MenuItem onClick={() => setMenuOpen(false)}>Settings</MenuItem>
          <MenuItem onClick={() => setMenuOpen(false)}>Help</MenuItem>
          <div className="my-1 h-px bg-white/10" />
          <MenuItem subtle onClick={() => setMenuOpen(false)}>
            Log out
          </MenuItem>
        </div>
      </MenuSheet>
    </div>
  );
}

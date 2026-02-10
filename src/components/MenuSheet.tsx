"use client";

import type { ReactNode } from "react";

export default function MenuSheet({
  open,
  onClose,
  title = "Menu",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute right-3 top-3 w-[320px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-white/10 bg-[#070A16] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold text-white/90">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/80 transition hover:bg-white/10"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-2">{children}</div>
      </div>
    </div>
  );
}

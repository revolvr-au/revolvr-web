"use client";

import Link from "next/link";

export default function GoLivePage() {
  return (
    <main className="relative min-h-screen w-full bg-[#05070C] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-black/30 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
        <h1 className="text-2xl font-semibold">Go Live</h1>
        <p className="mt-2 text-white/70">
          Ready to start a live session.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/login?redirectTo=/go-live"
            className="rounded-xl bg-emerald-400 px-5 py-3 text-center font-medium text-black hover:bg-emerald-300"
          >
            Sign in to go live
          </Link>

          <Link
            href="/public-feed"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-center font-medium text-white/90 hover:bg-white/10"
          >
            Back to feed
          </Link>
        </div>

        <p className="mt-5 text-xs text-white/40">
          (Broadcast start will be added next — this page is intentionally not auto-starting.)
        </p>
      </div>
    </main>
  );
}

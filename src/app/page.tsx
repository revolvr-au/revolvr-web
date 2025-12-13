// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col items-center justify-center px-6">
      <main className="w-full max-w-md text-center space-y-8">
        {/* Brand */}
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Revolvr</h1>
          <p className="text-sm text-white/60">
            Live support. Real momentum.
          </p>
        </header>

        {/* Value prop */}
        <section className="space-y-4 text-sm text-white/75">
          <p>
            Revolvr is a new kind of social platform where creators go live,
            share moments, and get supported in real time.
          </p>

          <p>
            No subscriptions. No ads chasing attention.
            <br />
            Just creators and the people backing them.
          </p>
        </section>

        {/* Primary actions */}
        <section className="space-y-3">
          <Link
            href="/public-feed"
            className="block w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-medium py-3 transition"
          >
            Watch Live
          </Link>

          <Link
            href="/login?redirectTo=/live"
            className="block w-full rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 py-3 text-sm transition"
          >
            Go Live as a Creator
          </Link>
        </section>

        {/* Creator earnings */}
        <section className="pt-4 text-[11px] text-white/50">
          Creators earn <span className="text-white/80 font-medium">45%</span> on
          all tips, boosts, and spins.
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 text-[10px] text-white/35">
        Early access · Features evolving fast
      </footer>
    </div>
  );
}

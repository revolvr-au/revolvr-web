'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

export default function HomePage() {
  const router = useRouter();
  const { session, loading } = useSupabaseAuth();

  // If already logged in, go straight to the dashboard
  useEffect(() => {
    if (!loading && session) {
      router.replace('/dashboard');
    }
  }, [loading, session, router]);

  // Optional loading state while checking the session
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p>Loading Revolvr…</p>
      </main>
    );
  }

  // Not logged in → show marketing hero
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="max-w-3xl text-center px-6">
        <p className="mb-4 text-sm tracking-[0.25em] uppercase text-emerald-400">
          Revolvr · Early Preview
        </p>

        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          The control panel for your <span className="text-emerald-400">Revolvr idea</span>.
        </h1>

        <p className="text-slate-300 mb-8">
          Revolvr keeps all your experiments, ideas and bets in one simple dashboard so you always
          know what to do next.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-semibold"
            onClick={() => router.push('/login')}
          >
            Get started
          </button>
          <button
            className="px-6 py-3 rounded-lg border border-slate-600 hover:border-slate-400 font-semibold"
            onClick={() => router.push('/login')}
          >
            Learn more
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          No fluff. No noise. Just a simple place to track the work that actually moves your idea
          forward.
        </p>
      </div>
    </main>
  );
}

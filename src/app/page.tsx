'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

export default function HomePage() {
  const router = useRouter();
  const { session, loading } = useSupabaseAuth();

  useEffect(() => {
    if (!loading && session) {
      router.replace('/dashboard');
    }
  }, [loading, session, router]);

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
          Replace this with a one–sentence description of what Revolvr actually does and who it is for.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button
            className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-semibold"
            onClick={() => router.push('/login')}
          >
            Get started
          </button>
          <button className="px-6 py-3 rounded-lg border border-slate-600 hover:border-slate-400 font-semibold">
            Learn more
          </button>
        </div>
      </div>
    </main>
  );
}

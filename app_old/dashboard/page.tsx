'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading } = useSupabaseAuth();

  useEffect(() => {
    if (!loading && !session) {
      // Not logged in → back to landing
      router.replace('/');
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p>Checking your session…</p>
      </main>
    );
  }

  if (!session) {
    // Short-circuit render while redirect happens
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">Revolvr Dashboard</h1>
      <p className="text-slate-300 mb-2">
        You are logged in as <span className="font-mono">{session.user.email}</span>.
      </p>
      <p className="text-slate-400">
        This is where we&apos;ll build the real control panel for your Revolvr idea.
      </p>
    </main>
  );
}

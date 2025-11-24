'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '../../../hooks/useSupabaseAuth';
import { supabase } from '../../../lib/supabaseClient';

type RevolvrItem = {
  id: string;
  name: string;
  notes: string | null;
  status: 'NEW' | 'ACTIVE' | 'WON' | 'LOST';
  value: number | null;
  createdAt: string;
  updatedAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading } = useSupabaseAuth();

  const [items, setItems] = useState<RevolvrItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect away if not logged in
  useEffect(() => {
    if (!loading && !session) {
      router.replace('/');
    }
  }, [loading, session, router]);

  // Fetch existing items once we know we have a session
  useEffect(() => {
    const fetchItems = async () => {
      if (!session) return;

      try {
        const res = await fetch('/api/items');
        if (!res.ok) throw new Error('Failed to fetch items');
        const data: RevolvrItem[] = await res.json();
        setItems(data);
      } catch (err) {
        console.error(err);
        setError('Could not load your items.');
      }
    };

    if (!loading && session) {
      fetchItems();
    }
  }, [loading, session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          notes: '',
          status: 'NEW',
          value: null,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || 'Failed to create item');
      }

      const created: RevolvrItem = await res.json();
      setItems((prev) => [created, ...prev]);
      setNewTitle('');
    } catch (err) {
      console.error(err);
      setError('Could not create item.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p>Checking your session…</p>
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      {/* Header with sign out */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Revolvr Dashboard</h1>

        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>v0.2 · Backed by Supabase · Prisma</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-slate-600 px-3 py-1 text-sm hover:border-slate-400"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* First action */}
      <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-1 text-sm font-semibold tracking-[0.2em] text-slate-400">
          FIRST ACTION
        </h2>
        <p className="mb-4 text-sm text-slate-300">
          Create a “Revolvr item”. This is saved inside your Supabase database via Prisma.
        </p>

        <form onSubmit={handleAddItem} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Name your Revolvr item…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 sm:w-auto"
          >
            {submitting ? 'Adding…' : 'Add item'}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      {/* Items list */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold tracking-[0.2em] text-slate-400">
          YOUR ITEMS
        </h2>

        {items.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nothing here yet. Add your first item on the left.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-slate-950/70 px-4 py-3 text-sm"
              >
                <span>{item.name}</span>
                <span className="text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

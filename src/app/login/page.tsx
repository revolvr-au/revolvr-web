'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError(null);

    try {
      const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;
      setStatus('sent');
    } catch (err: any) {
      setStatus('error');
      setError(err.message ?? 'Something went wrong sending the magic link.');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md px-6">
        <h1 className="text-2xl font-bold mb-4">Sign in to Revolvr</h1>
        <p className="text-slate-300 mb-6">
          Enter your email and we&apos;ll send you a one-click magic link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 focus:outline-none focus:ring focus:ring-emerald-500"
          />

          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 font-semibold disabled:opacity-60"
          >
            {status === 'sending' ? 'Sending link…' : 'Send magic link'}
          </button>
        </form>

        {status === 'sent' && (
          <p className="mt-4 text-emerald-400">
            Magic link sent! Check your email to finish signing in.
          </p>
        )}

        {status === 'error' && error && (
          <p className="mt-4 text-red-400">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

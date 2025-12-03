"use client";

import { supabase } from "@/lib/supabaseClients";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SITE_URL = "https://revolvr-web.vercel.app";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Local redirect target used when user already has a session
  const [redirectTo, setRedirectTo] = useState("/dashboard");

  // Read ?redirectTo=... from URL on the client (no useSearchParams)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const dest = params.get("redirectTo");

    if (dest) {
      setRedirectTo(dest);
    }
  }, []);

  // If already logged in, skip login and go to redirectTo
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          router.replace(redirectTo);
        }
      } catch (e) {
        console.error("Error checking session", e);
      }
    };

    checkSession();
  }, [router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // ✅ When user clicks the magic link in email, send them to PUBLIC FEED
          emailRedirectTo: `${SITE_URL}/public-feed`,
        },
      });

      if (error) throw error;

      setMessage(
        "Magic link sent. Check your email and open the link to finish signing in."
      );
    } catch (err) {
      console.error(err);
      setError("Revolvr couldn’t send the magic link. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#050814] text-white">
      <div className="w-full max-w-md px-6 py-8 rounded-2xl bg-[#070b1b] border border-white/10 shadow-xl shadow-black/40">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xl font-semibold tracking-tight">
              Revolvr
            </span>
            <span className="text-lg">🔥</span>
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">
            v0.1 · social preview
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 text-red-200 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {message ? (
          <p className="text-sm text-white/80 text-center">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-white/70">
                Sign in with a magic link
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition text-sm font-semibold py-2.5 disabled:opacity-60 disabled:hover:bg-emerald-500"
            >
              {isSending ? "Sending magic link…" : "Send magic link"}
            </button>

            <p className="text-[11px] text-white/40 text-center">
              We’ll email you a one-tap link. No passwords, no drama.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

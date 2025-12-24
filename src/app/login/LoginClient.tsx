"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

const safeDecode = (v: string | null) => {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

// Only allow same-origin relative paths like "/creator/dashboard".
// Blocks "http(s)://", "//evil.com", etc.
const safeRedirect = (input: string | null) => {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  // Must start with a single "/"
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;

  // Disallow protocol-looking strings
  if (raw.includes("://")) return null;

  return raw;
};

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => safeDecode(searchParams?.get("redirectTo") ?? null), [searchParams]);
  const redirect = useMemo(() => safeRedirect(redirectTo) ?? "/public-feed", [redirectTo]);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Enter your email address.");
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSent(false);

      const siteUrl = window.location.origin.replace(/\/$/, "");
      const emailRedirectTo = `${siteUrl}/auth/callback?redirectTo=${encodeURIComponent(redirect)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo },
      });

      if (error) {
        console.error("[login] signInWithOtp error", error);
        setError("Could not send magic link.");
        return;
      }

      setSent(true);
    } catch (e) {
      console.error("[login] unexpected error", e);
      setError("Could not send magic link.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/40 p-5 shadow-lg shadow-black/50">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-xs text-white/60 mt-1">
          We’ll email you a magic link.
        </p>

        <div className="mt-4 space-y-2">
          <label className="text-xs text-white/70">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:border-white/30"
          />

          {error && (
            <div className="text-xs text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {sent && !error && (
            <div className="text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
              Magic link sent. Check your email.
            </div>
          )}

          <button
            type="button"
            disabled={sending}
            onClick={handleSend}
            className="w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-2 text-sm disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send magic link"}
          </button>

          <button
            type="button"
            onClick={() => router.push(redirect)}
            className="w-full text-[11px] text-white/50 hover:text-white/70 mt-1"
          >
            Continue without signing in
          </button>

          <div className="text-[11px] text-white/35 mt-2">
            After signing in you’ll be redirected to: <span className="font-mono text-white/60">{redirect}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

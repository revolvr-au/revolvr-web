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

// Only allow internal relative paths
const safeRedirect = (v: string | null) => {
  if (!v) return null;
  const s = v.trim();
  if (!s.startsWith("/")) return null;
  // avoid protocol-relative or weird edge cases
  if (s.startsWith("//")) return null;
  return s;
};

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectToRaw = useMemo(
    () => safeDecode(searchParams?.get("redirectTo") ?? null),
    [searchParams]
  );

  const redirectTo = useMemo(
    () => safeRedirect(redirectToRaw) ?? "/public-feed",
    [redirectToRaw]
  );

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSend = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("Enter your email address.");

    try {
      setSending(true);
      setError(null);

      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin).replace(/\/$/, "");
      const emailRedirectTo = `${baseUrl}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

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
      <div className="w-full max-w-md rounded-2xl bg-black/40 border border-white/10 p-5 space-y-4">
        <div>
          <div className="text-xl font-semibold">Sign in</div>
          <div className="text-xs text-white/60">We’ll email you a magic link.</div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-white/70">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 text-red-200 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {sent && !error && (
          <div className="rounded-xl bg-emerald-500/10 text-emerald-100 text-sm px-3 py-2">
            Magic link sent. Check your inbox.
          </div>
        )}

        <button
          type="button"
          disabled={sending}
          onClick={onSend}
          className="w-full rounded-xl bg-emerald-500 text-black font-semibold py-2 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send magic link"}
        </button>

        <button
          type="button"
          onClick={() => router.push(redirectTo)}
          className="w-full text-xs text-white/60 hover:text-white/80"
        >
          Continue without signing in
        </button>

        <div className="text-[11px] text-white/45">
          After signing in you’ll be redirected to: <span className="text-white/70">{redirectTo}</span>
        </div>
      </div>
    </div>
  );
}

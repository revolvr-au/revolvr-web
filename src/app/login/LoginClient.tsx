// src/app/login/LoginClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const supabase = createSupabaseBrowserClient();

const safeDecode = (v: string | null) => {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

// allow only relative internal redirects
const safeRedirect = (v: string | null) => {
  if (!v) return null;
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  if (v.includes("\\")) return null;
  return v;
};

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => safeDecode(searchParams?.get("redirectTo") ?? null), [searchParams]);
  const redirect = useMemo(() => {
    const raw = redirectTo ?? null;
    const isInternal = !!raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\");
    return isInternal ? raw : safeRedirect(raw) ?? "/public-feed";
  }, [redirectTo]);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSend = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("Enter your email address.");

    try {
      setSending(true);
      setError(null);

      const emailRedirectTo = `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirect)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo },
      });

      if (error) {
        console.error("[login] signInWithOtp error", error);
        setError("Could not send magic link.");
        return;
      }
    } catch (e) {
      console.error("[login] unexpected", e);
      setError("Could not send magic link.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-black/40 border border-white/10 p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-xs text-white/60 mt-1">We’ll email you a magic link.</p>

        <div className="mt-4 space-y-2">
          <label className="text-xs text-white/60">Email</label>
          <input
            className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-400/20 text-red-200 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={sending}
            onClick={onSend}
            className="w-full mt-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send magic link"}
          </button>

          <div className="text-[11px] text-white/50 mt-3">
            After signing in you’ll be redirected to: <span className="font-mono">{redirect}</span>
          </div>

          <button
            type="button"
            onClick={() => router.push(redirect)}
            className="w-full text-xs text-white/50 hover:text-white/70 mt-3"
          >
            Continue without signing in
          </button>
        </div>
      </div>
    </div>
  );
}

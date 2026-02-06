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

  const redirectTo = useMemo(
    () => safeDecode(searchParams?.get("redirectTo") ?? null),
    [searchParams]
  );

  const redirect = useMemo(() => {
    const raw = redirectTo ?? null;
    const isInternal =
      !!raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\");
    return isInternal ? raw : safeRedirect(raw) ?? "/public-feed";
  }, [redirectTo]);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanEmail = email.trim().toLowerCase();

  async function onSend() {
    if (!cleanEmail) return setError("Enter your email address.");

    try {
      setSending(true);
      setError(null);

      // IMPORTANT: still include redirectTo so if user clicks link anyway it lands back on site
      // but our primary flow is now CODE verification.
      const origin = "https://www.revolvr.net";
      const emailRedirectTo = `${origin}/auth/callback?redirectTo=${encodeURIComponent(
        redirect
      )}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo,
          // If your Supabase project is configured for code-based emails, this will email a code.
          // Even if Supabase also includes a link, we will ignore it and use verifyOtp.
        },
      });

      if (error) {
        console.error("[login] signInWithOtp error", error);
        setError("Could not send code. Try again.");
        return;
      }

      setStage("code");
    } catch (e) {
      console.error("[login] unexpected", e);
      setError("Could not send code. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function onVerify() {
    const token = code.replace(/\s+/g, "");
    if (!cleanEmail) return setError("Enter your email address.");
    if (!token) return setError("Enter the 6-digit code from your email.");

    try {
      setVerifying(true);
      setError(null);

      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: "email",
      });

      if (error) {
        console.error("[login] verifyOtp error", error);
        setError("Invalid or expired code. Request a new code.");
        return;
      }

      if (!data?.session) {
        setError("Signed in, but no session was returned. Try again.");
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch (e) {
      console.error("[login] unexpected verify", e);
      setError("Could not verify code. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-black/40 border border-white/10 p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-xs text-white/60 mt-1">
          {stage === "email"
            ? "We’ll email you a 6-digit code."
            : "Enter the 6-digit code we emailed you."}
        </p>

        <div className="mt-4 space-y-2">
          <label className="text-xs text-white/60">Email</label>
          <input
            className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={stage === "code"} // lock email once code stage begins
          />

          {stage === "code" && (
            <>
              <label className="text-xs text-white/60 mt-3 block">6-digit code</label>
              <input
                className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                placeholder="123456"
                autoComplete="one-time-code"
              />
            </>
          )}

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-400/20 text-red-200 text-sm px-3 py-2">
              {error}
            </div>
          )}

          {stage === "email" ? (
            <button
              type="button"
              disabled={sending}
              onClick={onSend}
              className="w-full mt-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send code"}
            </button>
          ) : (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                disabled={verifying}
                onClick={onVerify}
                className="flex-1 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {verifying ? "Verifying…" : "Verify code"}
              </button>

              <button
                type="button"
                disabled={sending}
                onClick={() => {
                  setCode("");
                  onSend();
                }}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-60"
              >
                Resend
              </button>
            </div>
          )}

          <div className="text-[11px] text-white/50 mt-3">
            After signing in you’ll be redirected to:{" "}
            <span className="font-mono">{redirect}</span>
          </div>

          {stage === "code" && (
            <button
              type="button"
              onClick={() => {
                setStage("email");
                setCode("");
                setError(null);
              }}
              className="w-full text-xs text-white/50 hover:text-white/70 mt-3"
            >
              Use a different email
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push(redirect)}
            className="w-full text-xs text-white/50 hover:text-white/70 mt-3"
          >
            Explore first
          </button>
        </div>
      </div>
    </div>
  );
}

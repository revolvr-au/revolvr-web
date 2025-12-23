"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import {
  guessCountryFromLocale,
  getStoredCountry,
  isAgeOk,
  setAgeOk,
  setStoredCountry,
} from "@/lib/ageGate";

type Step = "country" | "au-age" | "login";

function safeRedirect(path: string | null | undefined) {
  if (!path) return "/public-feed";
  return path.startsWith("/") ? path : "/public-feed";
}

function getRedirectToFromUrl(): string {
  try {
    const u = new URL(window.location.href);
    return safeRedirect(u.searchParams.get("redirectTo"));
  } catch {
    return "/public-feed";
  }
}

// Legacy implicit-flow links (#access_token=...&refresh_token=...)
function getHashParams() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
  };
}

export default function LoginPage() {
  const router = useRouter();

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") return "/public-feed";
    return getRedirectToFromUrl();
  }, []);

  const [step, setStep] = useState<Step>("country");
  const [country, setCountry] = useState("US");
  const [dob, setDob] = useState("");
  const [confirm16, setConfirm16] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // 1) Legacy implicit flow support (if a link lands on /login#access_token=...)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === "undefined") return;

      const { access_token, refresh_token } = getHashParams();
      if (!access_token || !refresh_token) return;

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (cancelled) return;

      if (error) {
        console.error("[login] setSession error", error);
        setError("Could not complete sign in.");
        return;
      }

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );

      router.replace(redirectTo);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [router, redirectTo]);

  // 2) If already signed in, bounce immediately to redirectTo
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session) router.replace(redirectTo);
    })();

    return () => {
      mounted = false;
    };
  }, [router, redirectTo]);

  // 3) Age gate
  useEffect(() => {
    if (isAgeOk()) {
      setStep("login");
      return;
    }

    const stored = getStoredCountry();
    const guessed = stored || guessCountryFromLocale();

    setCountry(guessed);
    setStoredCountry(guessed);
    setStep("country");
  }, []);

  const onCountryContinue = () => {
    setError(null);
    if (!country) return setError("Please select your country.");

    setStoredCountry(country);

    if (country === "AU") setStep("au-age");
    else {
      setAgeOk();
      setStep("login");
    }
  };

  const onAuContinue = () => {
    setError(null);

    if (!dob) return setError("Please enter your date of birth.");
    if (!confirm16) return setError("Please confirm you are 16 or older.");

    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return setError("Invalid date of birth.");

    const now = new Date();
    const age =
      now.getFullYear() -
      birth.getFullYear() -
      (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);

    if (age < 16) return setError("Revolvr is available to ages 16+.");

    setAgeOk();
    setStep("login");
  };

  const sendMagicLink = async () => {
    setError(null);
    setSent(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("Enter your email address.");

    try {
      setSending(true);

      const redirect = safeRedirect(redirectTo);

      // keep cookie as fallback (nice-to-have)
      document.cookie = `rv_redirect=${encodeURIComponent(
        redirect
      )}; Path=/; Max-Age=600; SameSite=Lax`;

      const siteUrl = window.location.origin.replace(/\/$/, "");

      // IMPORTANT: include redirectTo in the callback URL
      const emailRedirectTo = `${siteUrl}/auth/callback?redirectTo=${encodeURIComponent(
        redirect
      )}`;

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
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-center mb-4">
          <div className="text-xl font-semibold">Revolvr</div>
          <div className="text-xs text-white/60">Sign in to watch and support</div>
        </div>

        {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

        {step === "country" && (
          <>
            <select
              className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="US">United States</option>
              <option value="AU">Australia</option>
              <option value="GB">United Kingdom</option>
              <option value="OTHER">Other</option>
            </select>

            <button
              onClick={onCountryContinue}
              className="mt-4 w-full bg-emerald-500 py-3 rounded-xl text-black font-semibold"
            >
              Continue
            </button>
          </>
        )}

        {step === "au-age" && (
          <>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3"
            />

            <label className="flex gap-2 mt-3 text-xs">
              <input
                type="checkbox"
                checked={confirm16}
                onChange={(e) => setConfirm16(e.target.checked)}
              />
              I am 16 or older
            </label>

            <button
              onClick={onAuContinue}
              className="mt-4 w-full bg-emerald-500 py-3 rounded-xl text-black font-semibold"
            >
              Continue
            </button>
          </>
        )}

        {step === "login" && (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3"
              placeholder="you@example.com"
            />

            <button
              disabled={sending}
              onClick={sendMagicLink}
              className="mt-4 w-full bg-emerald-500 py-3 rounded-xl text-black font-semibold disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send magic link"}
            </button>

            {sent && (
              <div className="text-xs text-emerald-300 mt-2 text-center">
                Check your inbox
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// src/app/login/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import {
  clearAgeOk,
  guessCountryFromLocale,
  getStoredCountry,
  isAgeOk,
  setAgeOk,
  setStoredCountry,
} from "@/lib/ageGate";

type CountryCode =
  | "US"
  | "CA"
  | "GB"
  | "AU"
  | "NZ"
  | "IE"
  | "SG"
  | "DE"
  | "FR"
  | "ES"
  | "IT"
  | "NL"
  | "SE"
  | "NO"
  | "DK"
  | "CH"
  | "OTHER";

export default function LoginPage() {
  const router = useRouter();

  const [redirectTo, setRedirectTo] = useState<string>("/public-feed");

  const [country, setCountry] = useState<CountryCode>("US");

  // AU-only DOB fields
  const [dob, setDob] = useState<string>(""); // yyyy-mm-dd
  const [confirm16, setConfirm16] = useState(false);

  // login
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Pull redirectTo from URL without useSearchParams (avoids Next Suspense/prerender issues)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const raw = sp.get("redirectTo") || "/public-feed";

      // Safety: only allow internal paths
      const safe = raw.startsWith("/") ? raw : "/public-feed";
      setRedirectTo(safe);
    } catch {
      setRedirectTo("/public-feed");
    }
  }, []);

  // Init: set country (stored > guessed), and enforce AU gating rules
  useEffect(() => {
    const stored = getStoredCountry();
    const guessed = (stored || guessCountryFromLocale()) as CountryCode;

    setCountry(guessed);
    setStoredCountry(guessed);

    // If AU, do NOT auto-allow. If non-AU, allow immediately.
    if (guessed === "AU") {
      // If previously age-ok from non-AU device use, AU must still gate.
      // We force-clear and require AU verification now.
      clearAgeOk();
    } else {
      setAgeOk();
    }
  }, []);

  const requiresAuGate = useMemo(() => country === "AU" && !isAgeOk(), [country]);

  const canSendMagicLink = useMemo(() => {
    if (!email.trim()) return false;
    if (country === "AU") return !requiresAuGate; // AU must complete gate first
    return true; // non-AU can continue
  }, [email, country, requiresAuGate]);

  const onCountryChange = (next: CountryCode) => {
    setError(null);
    setCountry(next);
    setStoredCountry(next);

    // Reset AU fields when changing
    setDob("");
    setConfirm16(false);
    setSent(false);

    if (next === "AU") {
      clearAgeOk();
    } else {
      setAgeOk();
    }
  };

  const confirmAuAge = () => {
    setError(null);

    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (!confirm16) {
      setError("Please confirm you are 16 years of age or older.");
      return;
    }

    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) {
      setError("Invalid date of birth.");
      return;
    }

    const now = new Date();
    const age =
      now.getFullYear() -
      birth.getFullYear() -
      (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
        ? 1
        : 0);

    if (age < 16) {
      setError("Revolvr is currently available to people aged 16 or older.");
      return;
    }

    setAgeOk();
    setError(null);
  };

  const sendMagicLink = async () => {
    setError(null);
    setSent(false);

    if (!canSendMagicLink) {
      if (country === "AU" && requiresAuGate) {
        setError("Please confirm your age to continue.");
      } else {
        setError("Enter your email address.");
      }
      return;
    }

    try {
      setSending(true);

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo}`,
        },
      });

      if (error) {
        console.error("[login] signInWithOtp error", error);
        setError("Could not send magic link. Try again.");
        return;
      }

      setSent(true);
    } catch (e) {
      console.error("[login] unexpected error", e);
      setError("Could not send magic link. Try again.");
    } finally {
      setSending(false);
    }
  };

  // Optional helper: if already signed in, skip login page
  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) router.push(redirectTo);
    };
    run().catch(() => {});
  }, [router, redirectTo]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/40">
        <div className="text-center">
          <div className="text-xl font-semibold tracking-tight">Revolvr</div>
          <div className="text-[11px] text-white/50 mt-1">v0.1 • social preview</div>
          <div className="text-[12px] text-white/60 mt-2">
            Sign in with a magic link.
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {/* Country (mandatory) */}
        <div className="mt-6 space-y-2">
          <label className="text-xs text-white/70">Country (required)</label>

          <select
            className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
            value={country}
            onChange={(e) => onCountryChange(e.target.value as CountryCode)}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="NZ">New Zealand</option>
            <option value="IE">Ireland</option>
            <option value="SG">Singapore</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="ES">Spain</option>
            <option value="IT">Italy</option>
            <option value="NL">Netherlands</option>
            <option value="SE">Sweden</option>
            <option value="NO">Norway</option>
            <option value="DK">Denmark</option>
            <option value="CH">Switzerland</option>
            <option value="OTHER">Other</option>
          </select>

          <div className="text-[11px] text-white/45">
            Australia requires age verification. Other countries can continue.
          </div>
        </div>

        {/* AU Age Verification (only if AU selected) */}
        {country === "AU" && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="text-sm font-semibold">Australia — confirm your age</div>
            <div className="text-[11px] text-white/55">
              Required before you can sign in.
            </div>

            <div>
              <label className="text-xs text-white/70">Date of birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={confirm16}
                onChange={(e) => setConfirm16(e.target.checked)}
              />
              I confirm that I am 16 years of age or older.
            </label>

            <button
              type="button"
              onClick={confirmAuAge}
              className="w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold py-3"
            >
              Confirm age
            </button>

            {!requiresAuGate && (
              <div className="text-[11px] text-emerald-200/90">
                Age confirmed for this device.
              </div>
            )}
          </div>
        )}

        {/* Sign in (same for new/existing in magic-link world) */}
        <div className="mt-6 space-y-4">
          <div className="text-center">
            <div className="text-lg font-semibold">Sign in</div>
            <div className="text-xs text-white/60 mt-1">
              We’ll email you a one-tap link. No passwords.
            </div>
          </div>

          <div>
            <label className="text-xs text-white/70">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
              placeholder="you@example.com"
              disabled={country === "AU" && requiresAuGate}
            />
          </div>

          <button
            type="button"
            disabled={sending || !canSendMagicLink}
            onClick={sendMagicLink}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold py-3"
          >
            {sending ? "Sending…" : "Send magic link"}
          </button>

          {sent && (
            <div className="text-[11px] text-emerald-200/90 text-center">
              Magic link sent. Check your inbox.
            </div>
          )}

          <div className="text-[11px] text-white/40 text-center">
            You’ll only need to do country/age once per device.
          </div>
        </div>
      </div>
    </div>
  );
}

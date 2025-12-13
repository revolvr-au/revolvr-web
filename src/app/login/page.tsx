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

function getRedirectToFromUrl(): string {
  if (typeof window === "undefined") return "/public-feed";
  const sp = new URLSearchParams(window.location.search);
  const raw = sp.get("redirectTo");
  return raw && raw.trim().length > 0 ? raw : "/public-feed";
}

export default function LoginPage() {
  const router = useRouter();

  const [redirectTo, setRedirectTo] = useState<string>("/public-feed");

  const [step, setStep] = useState<Step>("country");
  const [country, setCountry] = useState<string>("US");

  // AU-only DOB fields
  const [dob, setDob] = useState<string>(""); // yyyy-mm-dd (input type="date")
  const [confirm16, setConfirm16] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // login
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Initial boot: decide redirectTo + whether we need AU gate
  useEffect(() => {
    const rt = getRedirectToFromUrl();
    setRedirectTo(rt);

    // If already age-ok on this device, go straight to login
    if (isAgeOk()) {
      setStep("login");
      return;
    }

    const stored = getStoredCountry();
    const guessed = stored || guessCountryFromLocale() || "US";

    setCountry(guessed);
    setStoredCountry(guessed);

    if (guessed === "AU") {
      // AU requires DOB verification (your rule)
      setStep("au-age");
    } else {
      // Non-AU: no age gate
      setAgeOk();
      setStep("login");
    }
  }, []);

  const onCountryContinue = () => {
    setError(null);
    setStoredCountry(country);

    if (country === "AU") {
      setStep("au-age");
    } else {
      setAgeOk();
      setStep("login");
    }
  };

  const onAuContinue = () => {
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
    setStep("login");
  };

  const sendMagicLink = async () => {
    setError(null);
    setSent(false);

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    try {
      setSending(true);

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Keep your existing redirect behaviour:
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

  const subtitle = useMemo(() => {
    if (step === "au-age") return "Confirm your age to continue (Australia only).";
    if (step === "country") return "Choose your country (Australia only requires DOB).";
    return "Sign in with a magic link.";
  }, [step]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/40">
        <div className="text-center">
          <div className="text-xl font-semibold tracking-tight">Revolvr</div>
          <div className="text-[11px] text-white/50 mt-1">v0.1 • social preview</div>
          <div className="text-[12px] text-white/60 mt-2">{subtitle}</div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {/* COUNTRY STEP (optional) */}
        {step === "country" && (
          <div className="mt-6 space-y-4">
            <div>
              <div className="text-sm font-semibold">Where are you located?</div>
              <div className="text-xs text-white/60 mt-1">
                Australia requires date-of-birth verification. Other countries can continue.
              </div>
            </div>

            <select
              className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
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

            <button
              type="button"
              onClick={onCountryContinue}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3"
            >
              Continue
            </button>

            <div className="text-[11px] text-white/45 text-center">
              You’ll only do this once per device.
            </div>
          </div>
        )}

        {/* AU AGE STEP */}
        {step === "au-age" && (
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <div className="text-lg font-semibold">Confirm your age</div>
              <div className="text-xs text-white/60 mt-1">
                Australia requires date-of-birth verification to continue.
              </div>
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
              onClick={onAuContinue}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3"
            >
              Continue
            </button>

            <button
              type="button"
              onClick={() => setStep("country")}
              className="w-full text-[11px] text-white/50 hover:text-white/70"
            >
              Change country
            </button>
          </div>
        )}

        {/* LOGIN STEP */}
        {step === "login" && (
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <div className="text-lg font-semibold">Existing users — sign in</div>
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
              />
            </div>

            <button
              type="button"
              disabled={sending}
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

            <button
              type="button"
              onClick={() => setStep("country")}
              className="w-full text-[11px] text-white/45 hover:text-white/70"
            >
              Not in {country}? Change country
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

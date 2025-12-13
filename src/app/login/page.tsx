// src/app/login/page.tsx
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

  // Read redirectTo without useSearchParams (pre-render + suspense issues on Vercel)
  const [redirectTo, setRedirectTo] = useState<string>("/public-feed");

  // Country + AU age verification
  const [country, setCountry] = useState<CountryCode>("US");
  const [auAgeVerified, setAuAgeVerified] = useState<boolean>(false);

  // AU-only DOB fields (HTML date input returns yyyy-mm-dd)
  const [dob, setDob] = useState<string>("");
  const [confirm16, setConfirm16] = useState(false);

  // Login
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Initial boot: country + redirectTo + local age state
  useEffect(() => {
    // redirectTo
    try {
      const sp = new URLSearchParams(window.location.search);
      const r = sp.get("redirectTo");
      if (r && r.startsWith("/")) setRedirectTo(r);
    } catch {
      // keep default
    }

    // country
    const stored = getStoredCountry();
    const guessed = (stored || guessCountryFromLocale() || "US") as CountryCode;
    setCountry(guessed);
    setStoredCountry(guessed);

    // age state (persisted)
    setAuAgeVerified(isAgeOk());
  }, []);

  // When country changes:
  // - persist it
  // - if non-AU: consider them cleared for this device
  // - if AU: require verification unless already verified
  useEffect(() => {
    setStoredCountry(country);

    if (country !== "AU") {
      // Non-AU: no DOB gate. Mark ok (device-level) and enable sign-in.
      setAgeOk();
      setAuAgeVerified(true);
    } else {
      // AU: require verification; keep whatever we already know from storage
      setAuAgeVerified(isAgeOk());
    }

    // Reset transient UI bits
    setError(null);
    setSent(false);
  }, [country]);

  const needsAuAgeGate = useMemo(() => country === "AU" && !auAgeVerified, [country, auAgeVerified]);

  const validateAuAge = () => {
    setError(null);

    if (!dob) return "Please enter your date of birth.";
    if (!confirm16) return "Please confirm you are 16 years of age or older.";

    // dob expected yyyy-mm-dd from <input type="date" />
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return "Invalid date of birth.";

    const now = new Date();
    const birthdayThisYear = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    const age = now.getFullYear() - birth.getFullYear() - (now < birthdayThisYear ? 1 : 0);

    if (age < 16) return "Revolvr is currently available to people aged 16 or older.";

    return null;
  };

  const onConfirmAuAge = () => {
    const msg = validateAuAge();
    if (msg) {
      setError(msg);
      return;
    }

    // Persist + unlock sign-in immediately
    setAgeOk();
    setAuAgeVerified(true);
    setError(null);
  };

  const sendMagicLink = async () => {
    setError(null);
    setSent(false);

    // Country is mandatory
    if (!country) {
      setError("Please select your country to continue.");
      return;
    }

    // If AU selected, must verify first
    if (needsAuAgeGate) {
      setError("Please confirm your age to continue (Australia).");
      return;
    }

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    try {
      setSending(true);

      const emailRedirectTo = `${window.location.origin}${redirectTo}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo },
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

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/40">
        <div className="text-center">
          <div className="text-xl font-semibold tracking-tight">Revolvr</div>
          <div className="text-[11px] text-white/50 mt-1">v0.1 • social preview</div>
          <div className="text-[11px] text-white/45 mt-2">Sign in with a magic link.</div>
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
            onChange={(e) => setCountry(e.target.value as CountryCode)}
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

          <div className="text-[11px] text-white/55">
            {country === "AU"
              ? "Australia requires age verification before you can sign in."
              : "Australia requires age verification. Other countries can continue."}
          </div>
        </div>

        {/* AU age verification (inline block) */}
        {country === "AU" && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-semibold">Australia — confirm your age</div>
            <div className="text-xs text-white/60 mt-1">
              Required before you can sign in.
            </div>

            <div className="mt-4 space-y-3">
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
                onClick={onConfirmAuAge}
                className={`w-full rounded-xl py-3 font-semibold ${
                  auAgeVerified
                    ? "bg-emerald-500/20 text-emerald-100 border border-emerald-400/30"
                    : "bg-white/10 hover:bg-white/15 border border-white/15 text-white"
                }`}
              >
                {auAgeVerified ? "Age confirmed" : "Confirm age"}
              </button>
            </div>
          </div>
        )}

        {/* Sign in */}
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
            />
          </div>

          <button
            type="button"
            disabled={sending || needsAuAgeGate}
            onClick={sendMagicLink}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:hover:bg-emerald-500 text-black font-semibold py-3"
          >
            {needsAuAgeGate ? "Confirm age to continue" : sending ? "Sending…" : "Send magic link"}
          </button>

          {sent && (
            <div className="text-[11px] text-emerald-200/90 text-center">
              Magic link sent. Check your inbox.
            </div>
          )}

          {/* Optional: a safe “back” action if someone lands here unexpectedly */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full text-[11px] text-white/45 hover:text-white/70"
          >
            Back to Revolvr
          </button>
        </div>
      </div>
    </div>
  );
}

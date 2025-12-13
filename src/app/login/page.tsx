"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClients";
import {
  guessCountryFromLocale,
  getStoredCountry,
  isAgeOk,
  setAgeOk,
  setStoredCountry,
} from "@/lib/ageGate";

function getRedirectToFromUrl(): string {
  if (typeof window === "undefined") return "/public-feed";
  const sp = new URLSearchParams(window.location.search);
  const raw = sp.get("redirectTo");
  return raw && raw.trim().length > 0 ? raw : "/public-feed";
}

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
  const [redirectTo, setRedirectTo] = useState<string>("/public-feed");

  // Country is ALWAYS shown + required
  const [country, setCountry] = useState<CountryCode>("US");

  // AU-only age verification
  const [dob, setDob] = useState<string>(""); // yyyy-mm-dd
  const [confirm16, setConfirm16] = useState(false);

  // Login
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // UI
  const [error, setError] = useState<string | null>(null);

  // Initialize country from stored/locale, but still show the control (mandatory)
  useEffect(() => {
    setRedirectTo(getRedirectToFromUrl());

    const stored = getStoredCountry();
    const guessed = (stored || guessCountryFromLocale() || "US") as CountryCode;
    setCountry(guessed);
    setStoredCountry(guessed);
  }, []);

  const requiresAuAgeGate = country === "AU";

  // For AU: must pass DOB + checkbox to proceed
  // For non-AU: we set ageOk immediately (device flag) to avoid any future gating
  useEffect(() => {
    if (!requiresAuAgeGate) {
      setAgeOk();
      setDob("");
      setConfirm16(false);
    } else {
      // If user previously passed AU gate on this device, keep it.
      // If not, they must re-validate before sending magic link.
      // (We don't auto-step; we just enforce in canSend.)
    }
  }, [requiresAuAgeGate]);

  const auAgeError = useMemo(() => {
    if (!requiresAuAgeGate) return null;
    if (isAgeOk()) return null;

    if (!dob) return "Australia requires your date of birth.";
    if (!confirm16) return "Please confirm you are 16 years of age or older.";

    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return "Invalid date of birth.";

    const now = new Date();
    const age =
      now.getFullYear() -
      birth.getFullYear() -
      (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
        ? 1
        : 0);

    if (age < 16) return "Revolvr is currently available to people aged 16 or older.";

    return null;
  }, [requiresAuAgeGate, dob, confirm16]);

  const canSend = useMemo(() => {
    if (!email.trim()) return false;

    if (!requiresAuAgeGate) return true;

    // AU: either already age-ok on this device, OR user must satisfy DOB+checkbox now
    if (isAgeOk()) return true;

    return auAgeError === null;
  }, [email, requiresAuAgeGate, auAgeError]);

  const onCountryChange = (next: CountryCode) => {
    setError(null);
    setSent(false);
    setCountry(next);
    setStoredCountry(next);
  };

  const validateAndSetAuAgeOkIfNeeded = () => {
    if (!requiresAuAgeGate) return true;

    if (isAgeOk()) return true;

    if (auAgeError) {
      setError(auAgeError);
      return false;
    }

    // Passed AU gate now; mark device as age-ok
    setAgeOk();
    return true;
  };

  const sendMagicLink = async () => {
    setError(null);
    setSent(false);

    if (!country) {
      setError("Please select your country.");
      return;
    }

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    if (!validateAndSetAuAgeOkIfNeeded()) return;

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

        <div className="mt-6 space-y-4">
          {/* COUNTRY (mandatory) */}
          <div>
            <label className="text-xs text-white/70">Country (required)</label>
            <select
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
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

            <div className="text-[11px] text-white/45 mt-2">
              Australia requires age verification. Other countries can continue.
            </div>
          </div>

          {/* AU AGE VERIFICATION (inline, only when AU selected) */}
          {requiresAuAgeGate && !isAgeOk() && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
              <div>
                <div className="text-sm font-semibold">Australia — age verification</div>
                <div className="text-[11px] text-white/55 mt-1">
                  Confirm you are 16+ to continue.
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

              {auAgeError && (
                <div className="text-[11px] text-red-200/90">
                  {auAgeError}
                </div>
              )}
            </div>
          )}

          {/* EMAIL SIGN-IN */}
          <div>
            <div className="text-center">
              <div className="text-lg font-semibold">Existing users — sign in</div>
              <div className="text-xs text-white/60 mt-1">
                We’ll email you a one-tap link. No passwords.
              </div>
            </div>

            <label className="text-xs text-white/70 block mt-4">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="button"
            disabled={sending || !canSend}
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
        </div>
      </div>
    </div>
  );
}

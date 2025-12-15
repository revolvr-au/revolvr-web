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
  if (!path) return "/login";
  return path.startsWith("/") ? path : "/login";
}

function getRedirectToFromUrl(): string {
  try {
    const u = new URL(window.location.href);
    return safeRedirect(u.searchParams.get("redirectTo"));
  } catch {
    return "/login";
  }
}


export default function LoginPage() {
  const router = useRouter();

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") return "/login";
    return getRedirectToFromUrl();
  }, []);

  const [step, setStep] = useState<Step>("country");
  const [country, setCountry] = useState<string>("US");

  const [dob, setDob] = useState<string>("");
  const [confirm16, setConfirm16] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // If already signed in, go straight through.
  useEffect(() => {
    const goIfSignedIn = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) router.replace(redirectTo);
    };
    goIfSignedIn();
  }, [router, redirectTo]);

  // Gate flow
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
    if (!confirm16) return setError("Please confirm you are 16 years of age or older.");

    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return setError("Invalid date of birth.");

    const now = new Date();
    const age =
      now.getFullYear() -
      birth.getFullYear() -
      (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);

    if (age < 16) return setError("Revolvr is currently available to people aged 16 or older.");

    setAgeOk();
    setStep("login");
  };

const sendMagicLink = async () => {
  setError(null);
  setSent(false);

  const cleanEmail = email.trim();
  if (!cleanEmail) {
    setError("Enter your email address.");
    return;
  }

  try {
    setSending(true);

    const baseUrl = window.location.origin.replace(/\/$/, "");
    const redirect = redirectTo || "/login";

    // Backup cookie (ONLY add Secure on https)
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      `revolvr_redirectTo=${encodeURIComponent(redirect)}; Path=/; SameSite=Lax${secure}`;

    // Primary: redirectTo is embedded in the callback URL
    const emailRedirectTo = `${baseUrl}/auth/callback?redirectTo=${encodeURIComponent(redirect)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
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
          <div className="text-[11px] text-white/50 mt-1">Sign in to watch and support</div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {step === "country" && (
          <div className="mt-6 space-y-4">
            <div>
              <div className="text-sm font-semibold">Select your country (required)</div>
              <div className="text-xs text-white/60 mt-1">
                Australia requires age verification. Other countries continue straight to sign-in.
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
          </div>
        )}

        {step === "au-age" && (
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <div className="text-lg font-semibold">Confirm your age</div>
              <div className="text-xs text-white/60 mt-1">
                Australia requires date-of-birth verification.
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
          </div>
        )}

        {step === "login" && (
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <div className="text-lg font-semibold">Sign in</div>
              <div className="text-xs text-white/60 mt-1">We’ll email you a one-tap link.</div>
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
          </div>
        )}
      </div>
    </div>
  );
}

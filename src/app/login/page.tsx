"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

const SITE_URL = "https://revolvr-web.vercel.app";
const AGE_STORAGE_KEY = "rev_age_verified_16";
const MIN_AGE = 16;

function calculateAge(dob: Date) {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export default function LoginPage() {
  console.log("LoginPage RENDERED");

  // Age gate state
  const [dob, setDob] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [agePassed, setAgePassed] = useState(false);

  // Login / magic-link state
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On first load, check if this device has already passed the age gate
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(AGE_STORAGE_KEY);
    if (stored === "1") {
      setAgePassed(true);
    }
  }, []);

  // AGE GATE SUBMIT
  const handleAgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAgeError(null);

    if (!dob) {
      setAgeError("Please enter your date of birth.");
      return;
    }
    if (!ageConfirmed) {
      setAgeError("You must confirm that you are 16 or older.");
      return;
    }

    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) {
      setAgeError("Please enter a valid date.");
      return;
    }

    const age = calculateAge(parsed);
    if (age < MIN_AGE) {
      setAgeError(
        "Revolvr is only available to people aged 16 or older in Australia."
      );
      return;
    }

    // Age passed – remember on this device and show the login form
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AGE_STORAGE_KEY, "1");
    }
    setAgePassed(true);
  };

  // MAGIC LINK LOGIN SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${SITE_URL}/public-feed`,
        },
      });

      if (error) throw error;

      setMessage(
        "Magic link sent. Check your email and open the link to finish signing in."
      );
    } catch (err) {
      console.error(err);
      setError("Revolvr couldn’t send the magic link. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  // FIRST-TIME ON THIS DEVICE → AGE GATE
  if (!agePassed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#050814] text-white">
        <div className="w-full max-w-md px-6 py-8 rounded-2xl bg-[#070b1b] border border-white/10 shadow-xl shadow-black/40">
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-xl font-semibold tracking-tight">
                Revolvr
              </span>
              <span className="text-lg">🔥</span>
            </div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">
              v0.1 · social preview
            </p>
          </div>

          <h1 className="text-lg font-semibold mb-1 text-center">
            First time on this device?
          </h1>
          <p className="text-sm text-white/80 mb-1 text-center">
            Confirm your age to continue.
          </p>
          <p className="text-xs text-white/50 mb-4 text-center">
            Revolvr is only available to people aged 16 or older. You&apos;ll
            only need to do this once per device.
          </p>

          <form onSubmit={handleAgeSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-white/70">
                Date of birth
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
              />
              <span>I confirm that I am 16 years of age or older.</span>
            </label>

            {ageError && (
              <p className="text-xs text-red-400 whitespace-pre-line">
                {ageError}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition text-sm font-semibold py-2.5"
            >
              Continue
            </button>

            <p className="text-[11px] text-white/40 text-center mt-1">
              Already have a Revolvr account? Once you confirm your age here,
              you&apos;ll go straight to the login screen on this device.
            </p>
          </form>
        </div>
      </main>
    );
  }

  // RETURNING USERS ON THIS DEVICE → DIRECTLY TO MAGIC LINK LOGIN
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#050814] text-white">
      <div className="w-full max-w-md px-6 py-8 rounded-2xl bg-[#070b1b] border border-white/10 shadow-xl shadow-black/40">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xl font-semibold tracking-tight">
              Revolvr
            </span>
            <span className="text-lg">🔥</span>
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">
            v0.1 · social preview
          </p>
        </div>

        <h1 className="text-lg font-semibold mb-2 text-center">
          Existing users – sign in
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 text-red-200 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {message ? (
          <p className="text-sm text-white/80 text-center">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-white/70">
                Sign in with a magic link
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition text-sm font-semibold py-2.5 disabled:opacity-60 disabled:hover:bg-emerald-500"
            >
              {isSending ? "Sending magic link…" : "Send magic link"}
            </button>

            <p className="text-[11px] text-white/40 text-center">
  We’ll email you a one-tap link. No passwords, no drama.
</p>

<button
  type="button"
  onClick={() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AGE_STORAGE_KEY);
    }
    setAgePassed(false); // show the age screen again
  }}
  className="mt-3 text-[11px] text-emerald-400 hover:underline block mx-auto"
>
  First time using Revolvr on this device? Confirm your age.
</button>

          </form>
        )}
      </div>
    </main>
  );
}

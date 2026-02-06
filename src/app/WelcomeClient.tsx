"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";import { supabase } from "@/lib/supabase/client";

export default function WelcomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string>("");

  const redirectTo = searchParams?.get("redirectTo") || "/public-feed";

  async function signInWithProvider(provider: "google" | "apple") {
    
    // OAuth providers are not configured yet (Apple/Google dev accounts pending)
    console.warn(`[auth]  sign-in is coming soon`);
    return;

setStatus("loading");
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(
          redirectTo
        )}`,
      },
    });

    if (error) {
      setStatus("error");
      setError(error?.message ?? "Something went wrong.");
      return;
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setStatus("error");
      setError("Please enter your email.");
      return;
    }

      const origin =
        window.location.hostname === "www.revolvr.net"
          ? "https://www.revolvr.net"
          : window.location.origin;

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${origin}/auth/callback?redirectTo=${encodeURIComponent(
            redirectTo
          )}`,
        },
      });

    if (error) {
      setStatus("error");
      setError(error?.message ?? "Something went wrong.");
      return;
    }

    setStatus("sent");
  }

  const loading = status === "loading";

  return (
    <div className="min-h-screen w-full bg-white text-neutral-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
        {/* LEFT (desktop) */}
        <div className="hidden w-1/2 items-center justify-center md:flex">
          <div className="flex items-center justify-center">
            <img
              src="/brand/r-black.png"
              alt="Revolvr"
              className="h-auto w-[340px] select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex w-full flex-col items-start justify-start px-6 pb-10 pt-10 md:w-1/2 md:px-8 md:pt-12">
          {/* Mobile logo */}
          <div className="mb-6 flex w-full justify-center md:hidden">
            <img
              src="/brand/r-black.png"
              alt="Revolvr"
              className="h-auto w-[92px] select-none"
              draggable={false}
            />
          </div>

          <div className="w-full max-w-[560px]">
            <p
              className={`text-xl font-semibold tracking-wide text-neutral-700 md:text-2xl`}
            >
              Welcome to REVOLVR
            </p>

            <h1 className="mt-2 text-[40px] font-extrabold leading-[1.05] tracking-tight md:text-[46px]">
              Discover moments as they happen.
            </h1>

            <p className="mt-3 text-base leading-relaxed text-neutral-600 md:text-[17px]">
              Watch, listen, or join in — live or quietly.
            </p>

            {/* Card */}
            <div className="mt-7 rounded-[26px] border border-neutral-200 bg-white p-6 shadow-[0_18px_55px_rgba(0,0,0,0.07)]">
              <button
                type="button"
                onClick={() => signInWithProvider("apple")}
                disabled={loading}
                className="w-full rounded-2xl bg-neutral-950 px-5 py-3 text-center text-[15px] font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue with Apple
              </button>
                <div style={{ marginTop: 6, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>Coming soon</div>

              <button
                type="button"
                onClick={() => signInWithProvider("google")}
                disabled={loading}
                className="mt-3 w-full rounded-2xl bg-neutral-950 px-5 py-3 text-center text-[15px] font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue with Google
              </button>
                <div style={{ marginTop: 6, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>Coming soon</div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px w-full bg-neutral-200" />
                <div className="text-xs font-medium text-neutral-500">or</div>
                <div className="h-px w-full bg-neutral-200" />
              </div>

              <form onSubmit={sendMagicLink}>
                <label className="mb-2 block text-xs font-semibold text-neutral-600">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-[15px] outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-50"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 w-full rounded-2xl bg-neutral-950 px-5 py-3 text-center text-[15px] font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send magic link
                </button>
              </form>

              {status === "sent" && (
                <p className="mt-3 text-sm text-neutral-700">
                  Check your inbox — we’ve sent you a magic link.
                </p>
              )}
              {status === "error" && (
                <p className="mt-3 text-sm text-red-600">
                  {error || "Something went wrong. Please try again."}
                </p>
              )}

              <button
                type="button"
                onClick={() => router.push("/public-feed")}
                className="mt-5 text-sm font-semibold text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900"
              >
                Explore first
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

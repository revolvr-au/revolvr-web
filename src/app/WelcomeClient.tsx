"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Step = "email" | "code";

const safeRedirect = (v: string | null) => {
  if (!v) return "/public-feed";
  if (!v.startsWith("/")) return "/public-feed";
  if (v.startsWith("//")) return "/public-feed";
  if (v.includes("\\")) return "/public-feed";
  return v;
};

export default function WelcomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    return safeRedirect(searchParams?.get("redirectTo") ?? null);
  }, [searchParams]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string>("");

  const loading = status === "loading";

  async function signInWithProvider(provider: "google" | "apple") {
    // OAuth not configured yet
    console.warn(`[auth] ${provider} sign-in coming soon`);
    return;

    // (keep this block for later when enabled)
    // setStatus("loading");
    // setError("");
    // const { error } = await supabase.auth.signInWithOAuth({
    //   provider,
    //   options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}` },
    // });
    // if (error) { setStatus("error"); setError(error.message ?? "Something went wrong."); }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setStatus("error");
      setError("Please enter your email.");
      return;
    }

    // IMPORTANT: omit emailRedirectTo so we don't rely on callback cookies
    const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail });

    if (error) {
      console.error("[welcome] signInWithOtp error", error);
      setStatus("error");
      setError("Could not send code.");
      return;
    }

    setStatus("sent");
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanCode) {
      setStatus("error");
      setError("Enter the code from your email.");
      return;
    }

    const r = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, token: cleanCode }),
    });

    const j = (await r.json().catch(() => null)) as { ok?: boolean } | null;

    if (!r.ok || !j?.ok) {
      setStatus("error");
      setError("Invalid or expired code. Try again.");
      return;
    }

    // SSR cookies now exist; go where you want
    window.location.href = redirectTo;
  }

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
          <div className="mb-6 flex w-full justify-center md:hidden">
            <img
              src="/brand/r-black.png"
              alt="Revolvr"
              className="h-auto w-[92px] select-none"
              draggable={false}
            />
          </div>

          <div className="w-full max-w-[560px]">
            <p className="text-xl font-semibold tracking-wide text-neutral-700 md:text-2xl">
              Welcome to REVOLVR
            </p>

            <h1 className="mt-2 text-[40px] font-extrabold leading-[1.05] tracking-tight md:text-[46px]">
              Discover moments as they happen.
            </h1>

            <p className="mt-3 text-base leading-relaxed text-neutral-600 md:text-[17px]">
              Watch, listen, or join in — live or quietly.
            </p>

            <div className="mt-7 rounded-[26px] border border-neutral-200 bg-white p-6 shadow-[0_18px_55px_rgba(0,0,0,0.07)]">
              <button
                type="button"
                onClick={() => signInWithProvider("apple")}
                disabled={loading}
                className="w-full rounded-2xl bg-neutral-950 px-5 py-3 text-center text-[15px] font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue with Apple
              </button>
              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
                Coming soon
              </div>

              <button
                type="button"
                onClick={() => signInWithProvider("google")}
                disabled={loading}
                className="mt-3 w-full rounded-2xl bg-neutral-950 px-5 py-3 text-center text-[15px] font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue with Google
              </button>
              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
                Coming soon
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px w-full bg-neutral-200" />
                <div className="text-xs font-medium text-neutral-500">or</div>
                <div className="h-px w-full bg-neutral-200" />
              </div>

              {step === "email" ? (
                <form onSubmit={sendCode}>
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
                    {loading ? "Sending…" : "Send code"}
                  </button>

                  {status === "sent" && (
                    <p className="mt-3 text-sm text-neutral-700">
                      Check your inbox — we’ve sent you a code.
                    </p>
                  )}
                </form>
              ) : (
                <form onSubmit={verifyCode}>
                  <label className="mb-2 block text-xs font-semibold text-neutral-600">
                    Code
                  </label>
                  <input
                    inputMode="numeric"
                    placeholder="12345678"
                    value={code}
                    onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
}

                    disabled={loading}
                    className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-[15px] outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-50"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-3 w-full rounded-2xl bg-neutral-950 px-5 py-3 text-center text-[15px] font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Verifying…" : "Verify code"}
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => { setStatus("idle"); setError(""); setCode(""); setStep("email"); }}
                    className="mt-3 w-full text-sm font-semibold text-neutral-700 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900 disabled:opacity-60"
                  >
                    Use a different email
                  </button>
                </form>
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

            <div className="mt-6 text-[11px] text-neutral-400">
              REVOLVR_BUILD_SHA: NO_SHA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

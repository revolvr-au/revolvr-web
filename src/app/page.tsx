"use client";

const welcomeFont = Dancing_Script({ subsets: ["latin"], weight: ["600","700"] });


import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dancing_Script } from "next/font/google";
import { supabase } from "@/lib/supabase/client";

export default function WelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string>("");

  const redirectTo = searchParams?.get("redirectTo") || "/public-feed";

  async function signInWithProvider(provider: "google" | "apple") {
    setStatus("loading");
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
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

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* LEFT: Brand panel (desktop only) */}
        <section className="hidden lg:flex lg:w-1/2 items-start justify-start bg-neutral-50 p-16">
          <img src="/brand/r-black.png" alt="R" className="w-[240px] h-auto" />
        </section>

        {/* RIGHT: Auth panel */}
        <section className="w-full lg:w-1/2 flex flex-col justify-center px-4 py-12 lg:px-14 lg:py-16">
          <div className="w-full max-w-xl mx-auto lg:mx-0">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-4">
              <img src="/brand/r-black.png" alt="R" className="w-[80px] h-auto" />
            </div><p className={` text-xl md:text-2xl font-semibold tracking-wide text-neutral-700`}>Welcome to REVOLVR</p>


            <h1 className="text-3xl font-bold leading-tight">
              Discover moments as they happen.
            </h1>
            <p className="mt-3 text-base text-neutral-600">
              Watch, listen, or join in — live or quietly.
            </p>

            <div className="mt-5 rounded-2xl border border-[#eef0f4] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <button
                type="button"
                className="w-full rounded-xl px-4 py-[10px] font-semibold border border-neutral-200 bg-[#111113] text-white hover:opacity-95 disabled:opacity-60"
                onClick={() => signInWithProvider("apple")}
                disabled={status === "loading"}
              >
                Continue with Apple
              </button>

              <button
                type="button"
                className="mt-3 w-full rounded-xl px-4 py-[10px] font-semibold border border-neutral-200 bg-[#111113] text-white hover:opacity-95 disabled:opacity-60"
                onClick={() => signInWithProvider("google")}
                disabled={status === "loading"}
              >
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-200" />
                <span className="text-xs text-neutral-500">or</span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>

              <form onSubmit={sendMagicLink}>
                <label className="block text-xs text-neutral-600 mb-2">Email</label>
                <input
                  className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                />
                <button
                  type="submit"
                  className="mt-3 w-full rounded-xl px-4 py-[10px] font-semibold border border-neutral-200 bg-[#111113] text-white hover:opacity-95 disabled:opacity-60"
                  disabled={status === "loading"}
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
                className="mt-5 text-sm font-semibold underline underline-offset-4"
              >
                Explore first
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const supabase = createSupabaseBrowserClient();
export default function CreatorOnboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<
    "booting" | "needs_login" | "activating" | "success" | "error"
  >("booting");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
  let mounted = true;

  const activate = async (accessToken: string) => {
    if (!mounted) return;
    setStatus("activating");
    setMessage("Activating your creator account…");

    const res = await fetch("/api/creator/activate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Activation failed (${res.status}). ${text || "No response body."}`);
    }

    if (!mounted) return;
    setStatus("success");
    setMessage("Success. Redirecting…");
    router.replace("/creator");
  };

  const boot = async () => {
    try {
      // 1) Try immediately
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        await activate(data.session.access_token);
        return;
      }

      // 2) If not present yet, subscribe and wait briefly for SIGNED_IN / TOKEN_REFRESHED
      setStatus("booting");
      setMessage("Finalizing sign-in…");

      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.access_token) {
          try {
            sub.subscription.unsubscribe();
            await activate(session.access_token);
          } catch (e) {
            const err = e as Error;
            if (!mounted) return;
            setStatus("error");
            setMessage(err.message || "Something went wrong.");
          }
        }
      });

      // 3) Timeout: after a short grace period, then redirect
      setTimeout(async () => {
        const { data: retry } = await supabase.auth.getSession();
        if (retry.session?.access_token) return; // already handled via event or retry
        sub.subscription.unsubscribe();
        if (!mounted) return;
        setStatus("needs_login");
        setMessage("We couldn’t complete sign-in. Please try logging in again.");
        router.replace("/login");
      }, 2000);
    } catch (e) {
      const err = e as Error;
      if (!mounted) return;
      setStatus("error");
      setMessage(err.message || "Something went wrong.");
    }
  };

  void boot();
  return () => {
    mounted = false;
  };
}, [router]);


  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Creator onboarding</h1>

        <p className="mt-2 text-sm text-gray-600">
          {status === "booting" && "Checking your session…"}
          {status === "activating" && "Please keep this tab open."}
          {(status === "needs_login" ||
            status === "error" ||
            status === "success") &&
            (message || "—")}
        </p>

        {(status === "error" || status === "needs_login") && (
          <button
            type="button"
            className="mt-4 w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
            onClick={() => router.replace("/login")}
          >
            Go to login
          </button>
        )}
      </div>
    </div>
  );
}

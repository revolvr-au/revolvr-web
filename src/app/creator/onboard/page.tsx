"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

export default function CreatorOnboardPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [status, setStatus] = useState<
    "booting" | "needs_login" | "activating" | "success" | "error"
  >("booting");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data.session;
        if (!session?.access_token) {
          if (!mounted) return;
          setStatus("needs_login");
          setMessage("You’re not signed in. Please log in again.");
          router.replace("/login");
          return;
        }

        if (!mounted) return;
        setStatus("activating");
        setMessage("Activating your creator account…");

        const res = await fetch("/api/creator/activate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `Activation failed (${res.status}). ${text || "No response body."}`
          );
        }

        if (!mounted) return;
        setStatus("success");
        setMessage("Success. Redirecting…");
        router.replace("/creator");
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
  }, [router, supabase]);

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

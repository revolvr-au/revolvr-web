"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type CreateLiveResponse =
  | { sessionId: string }
  | { id: string }
  | { session_id: string }
  | { error: string };

export default function GoLivePage() {
  const router = useRouter();
  const [status, setStatus] = useState("Starting live session…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // 1) Require auth
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const email = (user?.email || "").trim().toLowerCase();
        if (!email) {
          // Login then come back here
          router.replace("/login?redirectTo=/go-live");
          return;
        }

        // 2) Create a new live session (pages route exists in your build output)
        setStatus("Creating room…");
        const res = await fetch("/api/live/create", { method: "POST" });

        const json = (await res.json().catch(() => ({}))) as CreateLiveResponse;

        if (!res.ok) {
          const msg =
            typeof (json as any)?.error === "string"
              ? (json as any).error
              : `Create failed (${res.status})`;
          throw new Error(msg);
        }

        // Accept a few possible shapes
        const sessionId =
          (json as any).sessionId || (json as any).id || (json as any).session_id;

        if (!sessionId || typeof sessionId !== "string") {
          throw new Error("Create live did not return a session id.");
        }

        if (cancelled) return;

        // 3) Redirect to the room (creator attribution required by live page)
        const url = `/live/${encodeURIComponent(sessionId)}?creator=${encodeURIComponent(
          email
        )}`;

        setStatus("Redirecting…");
        router.replace(url);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to start live session.");
        setStatus("Could not start live.");
      }
    }

    run();
    return () => {
      cancelled = true; // IMPORTANT: lowercase true
    };
  }, [router]);

  return (
    <main className="min-h-[70vh] w-full flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl bg-black/30 ring-1 ring-white/10 p-6 text-white">
        <div className="text-lg font-semibold">Go Live</div>
        <div className="mt-2 text-sm text-white/70">{status}</div>

        {error ? (
          <div className="mt-4">
            <div className="text-sm text-red-300">{error}</div>
            <button
              className="mt-4 w-full rounded-xl bg-white/10 hover:bg-white/15 py-3 text-sm font-medium"
              onClick={() => router.push("/public-feed")}
            >
              Back to feed
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

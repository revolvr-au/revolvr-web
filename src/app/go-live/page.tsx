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

  // AUTO-START DISABLED: Go Live should land here and not redirect.
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

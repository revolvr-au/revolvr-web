// src/app/go-live/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type LiveCreateResp =
  | { sessionId?: string; id?: string; room?: string; error?: string }
  | Record<string, unknown>;

export default function GoLivePage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Starting your live…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const { data } = await supabase.auth.getUser();
        const emailRaw = data?.user?.email ?? "";
        const creatorEmail = String(emailRaw).trim().toLowerCase();

        if (!creatorEmail) {
          router.replace("/login?redirectTo=/go-live");
          return;
        }

        const res = await fetch("/api/live/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        const json = (await res.json().catch(() => ({}))) as LiveCreateResp;

        if (!res.ok) {
          const err = (json as any)?.error || `Failed to create live (${res.status})`;
          throw new Error(String(err));
        }

        const sessionId =
          (json as any)?.sessionId ||
          (json as any)?.id ||
          (json as any)?.room ||
          "";

        if (!sessionId) throw new Error("Live create did not return a session id.");

        router.replace(
          `/live/${encodeURIComponent(String(sessionId))}?creator=${encodeURIComponent(
            creatorEmail
          )}`
        );
      } catch (e: any) {
        console.error("[go-live] failed", e);
        if (!cancelled) setMsg(`Could not start live: ${e?.message ?? "unknown error"}`);
      }
    }

    run();
    return () => {
      cancelled = true
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#05070C] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="text-xl font-semibold">Revolvr</div>
        <div className="mt-3 text-sm text-white/70">{msg}</div>
      </div>
    </main>
  );
}

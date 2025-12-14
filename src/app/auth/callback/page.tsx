"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

function safeRedirectTo(): string {
  try {
    const u = new URL(window.location.href);
    const r = u.searchParams.get("redirectTo") || "/public-feed";
    return r.startsWith("/") ? r : "/public-feed";
  } catch {
    return "/public-feed";
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const redirectTo = safeRedirectTo();

      try {
        // This is the correct place to do the exchange
        await supabase.auth.exchangeCodeForSession(window.location.href);
      } catch (e) {
        console.warn("[auth/callback] exchangeCodeForSession failed", e);
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      router.replace(redirectTo);
    };

    run();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-lg font-semibold">Signing you in…</div>
        <div className="text-xs text-white/60 mt-2">Please wait.</div>
      </div>
    </div>
  );
}

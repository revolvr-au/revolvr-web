"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

function safeRedirectTo(sp: ReadonlyURLSearchParams): string {
  const r = sp.get("redirectTo") || "/public-feed";
  return r.startsWith("/") ? r : "/public-feed";
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Next typings can allow null — guard once.
    if (!searchParams) return;

    const run = async () => {
      const code = searchParams.get("code");
      const redirectTo = safeRedirectTo(searchParams);

      if (!code) {
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[auth/callback] exchangeCodeForSession failed", error);
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      router.replace(redirectTo);
    };

    run();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-4">
      <div className="text-sm text-white/70">Signing you in…</div>
    </div>
  );
}

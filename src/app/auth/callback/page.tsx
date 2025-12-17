"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

function safePath(p: string | null, fallback: string) {
  if (!p) return fallback;
  if (!p.startsWith("/")) return fallback;
  return p;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      const code = params?.get("code") ?? null;
      const redirectTo = safePath(params?.get("redirectTo") ?? null, "/");

      // No code = not a magic link → login
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

      // SUCCESS — session is now stored
      router.replace(redirectTo);
    };

    run();
  }, [params, router]);

  return <div className="p-6 text-white">Signing you in…</div>;
}

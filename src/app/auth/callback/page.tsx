"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

function safePath(p: string | null | undefined, fallback: string) {
  if (!p) return fallback;
  return p.startsWith("/") ? p : fallback;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      try {
        const url = new URL(window.location.href);

        const code = url.searchParams.get("code");
        const redirectTo = safePath(url.searchParams.get("redirectTo"), "/public-feed");

        // 1) PKCE flow (preferred)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[auth/callback] exchangeCodeForSession error", error);
            router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
            return;
          }

          router.replace(redirectTo);
          return;
        }

        // 2) Hash-token flow (fallback)
        // If Supabase sent #access_token=... etc, this will store a session.
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) {
          console.error("[auth/callback] getSessionFromUrl error", error);
          router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
          return;
        }

        if (!data?.session) {
          router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
          return;
        }

        router.replace(redirectTo);
      } catch (e) {
        console.error("[auth/callback] unexpected error", e);
        router.replace("/login");
      }
    };

    run();
  }, [router]);

  return <div className="p-6 text-white">Signing you in…</div>;
}

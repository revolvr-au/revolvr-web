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

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const redirectTo = safePath(params.get("redirectTo"), "/public-feed");

        if (!code) {
          router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
          return;
        }

        // IMPORTANT: exchange FIRST (this creates the session)
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("[auth/callback] exchangeCodeForSession error:", error);
          router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
          return;
        }

        // Optional: confirm session exists after exchange (debug safety)
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          console.error("[auth/callback] No session after exchange (unexpected)");
          router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
          return;
        }

        router.replace(redirectTo);
      } catch (e) {
        console.error("[auth/callback] unexpected error:", e);
        router.replace("/login");
      }
    })();
  }, [router]);

  return <div className="p-6 text-white">Signing you in…</div>;
}

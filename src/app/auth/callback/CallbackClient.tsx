"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

function safePath(p: string | null, fallback: string) {
  if (!p) return fallback;
  // prevent open-redirects; allow only internal paths
  if (!p.startsWith("/")) return fallback;
  return p;
}

export default function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
    const code = params?.get("code") ?? null;
    const redirectTo = safePath(params?.get("redirectTo"), "/public-feed");

      if (!code) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[auth/callback] exchangeCodeForSession error", error);
        router.replace("/login");
        return;
      }

      router.replace(redirectTo);
    };

    run();
  }, [params, router]);

  return <div className="p-6 text-white">Signing you in…</div>;
}

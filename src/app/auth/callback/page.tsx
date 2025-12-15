"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState("Signing you in…");

  const redirectTo = useMemo(() => {
    const r = sp.get("redirectTo") || "/public-feed";
    return r.startsWith("/") ? r : "/public-feed";
  }, [sp]);

  useEffect(() => {
    const run = async () => {
      try {
        // If Supabase redirected with ?code= (PKCE)
        const code = sp.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // If Supabase redirected with #access_token= (implicit)
          // detectSessionInUrl must be TRUE for supabase-js to pick it up.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setMsg("No session found. Redirecting to login…");
            router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
            return;
          }
        }

        router.replace(redirectTo);
      } catch (e: any) {
        console.error("[auth/callback] error", e);
        setMsg("Sign-in failed. Redirecting to login…");
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      }
    };

    run();
  }, [router, redirectTo, sp]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-sm opacity-70">{msg}</div>
    </div>
  );
}

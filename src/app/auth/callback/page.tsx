"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export default function AuthCallbackPage() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const { data: s } = await supabase.auth.getSession();
if (!s.session) {
  router.replace(`/login?redirectTo=${encodeURIComponent("/creator/onboard")}`);
  return;
}

      if (!code) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth callback error:", error);
        router.replace("/login");
        return;
      }

      // SUCCESS: always land safely
      router.replace("/public-feed");
    };

    run();
  }, [router]);

  return <div className="p-6 text-white">Signing you in…</div>;
}

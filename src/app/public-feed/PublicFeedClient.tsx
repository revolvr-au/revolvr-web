"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export default function PublicFeedClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const redirectToLogin = () => {
      router.replace("/login?redirectTo=/creator/onboard");

    const init = async () => {
      // 1) First check
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        if (isMounted) setReady(true);
        return;
      }

      // 2) Listen for session after magic-link redirect
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        if (session) setReady(true);
        else redirectToLogin();
      });

      // 3) Safety timeout
      const t = window.setTimeout(async () => {
        if (!isMounted) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) setReady(true);
        else redirectToLogin();
      }, 2000);

      return () => {
        window.clearTimeout(t);
        authListener.subscription.unsubscribe();
      };
    };

    let cleanup: void | (() => void);

    init().then((fn) => {
      cleanup = fn;
    });

    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen p-6">
        <div className="text-sm opacity-70">Loading feed…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-xl font-semibold">Public Feed</h1>
      <p className="mt-2 text-sm opacity-70">Feed is ready. Next: render posts here.</p>
    </div>
  );
}

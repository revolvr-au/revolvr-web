"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export default function PublicFeedPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const redirectToLogin = () => {
      router.replace("/login?redirectTo=/public-feed");
    };

    const init = async () => {
      // 1) First check
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        if (isMounted) setReady(true);
        return;
      }

      // 2) If not present yet, listen for the session to arrive (common after magic-link redirect)
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;

        if (session) {
          setReady(true);
        } else {
          redirectToLogin();
        }
      });

      // 3) Optional: safety timeout so you never hang forever
      window.setTimeout(async () => {
        if (!isMounted) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) setReady(true);
        else redirectToLogin();
      }, 2000);

      return () => authListener.subscription.unsubscribe();
    };

    const cleanupPromise = init();

    return () => {
      isMounted = false;
      // best effort cleanup if init returned a function
      void cleanupPromise;
    };
  }, [router]);

  if (!ready) {
    return <div className="min-h-screen p-6">Loading feed…</div>;
  }

  return <div className="min-h-screen">…feed…</div>;
}

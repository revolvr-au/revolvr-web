"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export default function CreatorGate() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (cancelled) return;

        if (!data.session) {
          router.replace("/login?redirectTo=%2Fcreator");
          return;
        }

        // If you have a "me" endpoint that determines creator onboarding status:
        // - 200 => creator exists / allowed, stay on /creator
        // - 404/401 => push to /creator/onboard
        try {
          const res = await fetch("/api/creator/me", { cache: "no-store" });

          if (cancelled) return;

          if (res.status === 200) {
            // user is authenticated + creator accessible
            setChecking(false);
            return;
          }

          // If not a creator yet, go to onboard
          router.replace("/creator/onboard");
        } catch {
          // If API call fails for any reason, don’t dead-end; send to onboard
          router.replace("/creator/onboard");
        }
      } catch (e) {
        console.error("[CreatorGate] session check error", e);
        router.replace("/login?redirectTo=%2Fcreator");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-6">
        Loading creator…
      </div>
    );
  }

  // If your /creator page itself renders dashboard/onboard, keep it.
  // This gate just prevents unauthenticated access.
  return null;
}

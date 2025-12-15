"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export default function PublicFeedClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;

        if (!alive) return;

        // If not signed in, send to login.
        // IMPORTANT: we want creator intent to land on onboarding, not bounce back to /public-feed.
        if (!user) {
          router.replace(`/login?redirectTo=${encodeURIComponent("/creator/onboard")}`);
          return;
        }

        setReady(true);
      } catch {
        if (!alive) return;
        router.replace(`/login?redirectTo=${encodeURIComponent("/creator/onboard")}`);
      }
    };

    run();

    return () => {
      alive = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen p-6">
        Loading feed…
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Public Feed</h1>
      <p className="mt-2 opacity-70">Feed is ready. Next: render posts here.</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

export default function PublicFeedClient() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await supabase.auth.getUser(); // ok to keep if you rely on session warm-up
      if (cancelled) return;
      setReady(true);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <div className="p-6 text-white">Loading feed…</div>;

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-semibold">Public Feed</h1>
      <div className="text-white/60 mt-2">Feed is ready. Next: render posts here.</div>
    </div>
  );
}

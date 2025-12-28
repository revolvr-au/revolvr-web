"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

export default function PublicFeedClient() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await supabase.auth.getUser(); // keep if you want it warmed up
      if (cancelled) return;
      setReady(true);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <div className="min-h-screen bg-[#050814] text-white p-6">Loading feed…</div>;
  }

  return (
    <div className="min-h-screen bg-[#050814] text-white p-6">
      <h1 className="text-xl font-semibold">Public Feed</h1>
      <div className="mt-2 text-white/60">Feed is ready. Next: render posts here.</div>
    </div>
  );
}

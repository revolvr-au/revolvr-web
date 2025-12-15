"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export default function PublicFeedClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { data } = await supabase.auth.getUser();

      if (cancelled) return;

      // ❗ DO NOT redirect if user is logged out
      // Public feed must be PUBLIC
      setReady(true);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <div className="p-6 text-white">Loading feed…</div>;
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-semibold">Public Feed</h1>
      {/* your feed UI here */}
    </div>
  );
}

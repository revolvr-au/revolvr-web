"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export default function PublicFeedPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login?redirectTo=/public-feed");
        return;
      }
      setReady(true);
    };
    run();
  }, [router]);

  if (!ready) return null;

  return <div className="min-h-screen">…feed…</div>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export function FloatingLiveButton() {
  const router = useRouter();
  const pathname = usePathname();

  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) setHasUser(!!user);
      } catch (err) {
        console.error("[FloatingLiveButton] error loading user", err);
        if (!cancelled) setHasUser(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    console.log("[FloatingLiveButton] state", { pathname, hasUser, ready });
  }, [pathname, hasUser, ready]);

  // Only on the public feed
  if (pathname !== "/public-feed") return null;

  // Avoid SSR mismatch – don’t render until we know user state
  if (!ready) return null;

  const handleClick = () => {
    if (!hasUser) {
      const redirect = encodeURIComponent("/live/host");
      router.push(`/login?redirectTo=${redirect}`);
      return;
    }
    router.push("/live/host");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed bottom-24 right-4 z-40 rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold shadow-lg shadow-rose-500/40 hover:bg-rose-500 transition-transform duration-150 hover:-translate-y-0.5 active:scale-95"
    >
      🔴 Go Live
    </button>
  );
}

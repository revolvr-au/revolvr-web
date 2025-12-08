"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type AuthState = {
  checked: boolean;
  isLoggedIn: boolean;
};

export function FloatingLiveButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<AuthState>({
    checked: false,
    isLoggedIn: false,
  });

  // 🔒 Only show on the public feed, nowhere else (no button on /login, etc.)
  if (pathname !== "/public-feed") {
    return null;
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setAuth({ checked: true, isLoggedIn: !!user });
      } catch (e) {
        console.error("[FloatingLiveButton] auth check error", e);
        setAuth({ checked: true, isLoggedIn: false });
      }
    };

    checkUser();
  }, []);

  const handleClick = () => {
    // don’t do anything while we’re still checking auth
    if (!auth.checked) return;

    // if not logged in, push through login with redirect back to feed
    if (!auth.isLoggedIn) {
      const redirect = encodeURIComponent("/public-feed");
      router.push(`/login?redirectTo=${redirect}`);
      return;
    }

    // logged in → go to host page
    router.push("/live/host");
  };

  return (
    <button
      onClick={handleClick}
      className="
        fixed bottom-6 right-6 z-40
        rounded-full px-6 py-3
        bg-[#ff0055] text-white text-sm font-semibold
        shadow-[0_0_45px_rgba(255,0,85,0.75)]
        flex items-center gap-2
        hover:scale-105 active:scale-95
        transition-transform
      "
    >
      <span className="inline-block h-2 w-2 rounded-full bg-red-300 animate-pulse" />
      Go Live
    </button>
  );
}

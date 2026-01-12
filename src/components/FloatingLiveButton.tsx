// src/components/FloatingLiveButton.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type AuthState = {
  checked: boolean;
  isLoggedIn: boolean;
  isCreator: boolean;
};

export function FloatingLiveButton() {
  const router = useRouter();
  const pathname = usePathname();

  const [auth, setAuth] = useState<AuthState>({
    checked: false,
    isLoggedIn: false,
    isCreator: false,
  });

  useEffect(() => {
    if (pathname !== "/public-feed") return;

    let cancelled = false;

    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        const isLoggedIn = !!user;
        const isCreator = !!user?.user_metadata?.is_creator;

        setAuth({ checked: true, isLoggedIn, isCreator });
      } catch (e) {
        console.error("[FloatingLiveButton] auth check error", e);
        if (!cancelled) setAuth({ checked: true, isLoggedIn: false, isCreator: false });
      }
    };

    checkUser();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (pathname !== "/public-feed") return null;

  // Don’t flash button before we know auth state
  if (!auth.checked) return null;

  const handleClick = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?redirectTo=/creator");
      return;
    }

    if (!user.user_metadata?.is_creator) {
      router.push("/creator/onboard");
      return;
    }

    router.push("/creator");
  };

  const label = !auth.isLoggedIn ? "Login to go live" : auth.isCreator ? "Go Live" : "Become a creator";

  return (
    <button
      onClick={handleClick}
      className="
        fixed right-6 z-40 bottom-[calc(1.5rem+56px+env(safe-area-inset-bottom))]
        rounded-full px-6 py-3
        bg-[#ff0055] text-white text-sm font-semibold
        shadow-[0_0_30px_rgba(255,0,85,0.55)]
        flex items-center gap-2
        hover:scale-105 active:scale-95
        transition-transform
      "
      aria-label={label}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-red-300 animate-pulse" />
      {label}
    </button>
  );
}

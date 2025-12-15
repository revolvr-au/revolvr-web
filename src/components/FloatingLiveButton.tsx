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

  // ✅ Hooks ALWAYS run
  useEffect(() => {
    if (pathname !== "/public-feed") return;

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
  }, [pathname]);

  // ✅ Conditional return AFTER hooks
  if (pathname !== "/public-feed") {
    return null;
  }

  const handleClick = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in → login → onboarding
  if (!user) {
    router.push("/login?redirectTo=/creator/onboard");
    return;
  }

  // Logged in but NOT a creator → onboarding
  if (!user.user_metadata?.is_creator) {
    router.push("/creator/onboard");
    return;
  }

  // Creator → dashboard
  router.push("/creator");
};



  return (
    <button
      onClick={handleClick}
      className="
        fixed bottom-6 right-6 z-40
        rounded-full px-6 py-3
        bg-[#ff0055] text-white text-sm font-semibold
        shadow-[0_0_30px_rgba(255,0,85,0.55)]
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

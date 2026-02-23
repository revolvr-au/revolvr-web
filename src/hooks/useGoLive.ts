"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export function useGoLive(onAllowed: () => void) {
  const router = useRouter();

  const goLive = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?redirectTo=/public-feed");
      return;
    }

    if (!user.user_metadata?.is_creator) {
      router.push("/creator/onboard");
      return;
    }

    // If authenticated creator → trigger overlay
    onAllowed();
  };

  return goLive;
}
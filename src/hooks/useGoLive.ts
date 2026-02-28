"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export function useGoLive(onAllowed: () => void) {
  const router = useRouter();

  const goLive = async () => {
    try {
      // Use getSession first (more reliable on iOS)
      const { data: sessionData } = await supabase.auth.getSession();
      let user = sessionData.session?.user ?? null;

      // If no session yet, wait briefly and retry (hydration guard)
      if (!user) {
        await new Promise((r) => setTimeout(r, 300));
        const { data: retryData } = await supabase.auth.getSession();
        user = retryData.session?.user ?? null;
      }

      if (!user) {
        router.push("/login?redirectTo=/public-feed");
        return;
      }

      if (!user.user_metadata?.is_creator) {
        router.push("/creator/onboard");
        return;
      }

      onAllowed();
    } catch (err) {
      console.error("goLive auth error", err);
      router.push("/login?redirectTo=/public-feed");
    }
  };

  return goLive;
}

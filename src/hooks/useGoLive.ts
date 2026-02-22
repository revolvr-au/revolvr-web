"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export function useGoLive() {
  const router = useRouter();

  const goLive = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?redirectTo=/go-live");
      return;
    }

    if (!user.user_metadata?.is_creator) {
      router.push("/creator/onboard");
      return;
    }

    router.push("/go-live");
  };

  return goLive;
}
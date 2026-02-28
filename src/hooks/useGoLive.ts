"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export function useGoLive(onAllowed: () => void) {
  const router = useRouter();

  const goLive = async () => {
    const {
  data: { user },
} = await supabase.auth.getUser();

console.log("USER", user);
alert("USER: " + JSON.stringify(user));
alert("META: " + JSON.stringify(user?.user_metadata));

    alert(
      user
        ? "User detected: " + user.email
        : "No user session detected on this device"
    );

    if (!user) {
      router.push("/login?redirectTo=/public-feed");
      return;
    }

    if (!user.user_metadata?.is_creator) {
      alert("User is not a creator");
      router.push("/creator/onboard");
      return;
    }

    alert("Creator OK — going live");
    onAllowed();
  };

  return goLive;
}
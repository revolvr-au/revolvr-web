"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

function getCookie(name: string) {
  const v = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
  return v ? decodeURIComponent(v) : null;
}

export default function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const code = params?.get("code") ?? null;

      if (!code) {
        router.replace("/");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth/callback] exchangeCodeForSession error", error);
        router.replace("/login");
        return;
      }

      const intent = getCookie("revolvr_intent");

      if (intent === "creator") router.replace("/creator/onboard");
      else router.replace("/public-feed");
    };

    run();
  }, [params, router]);

  return <div className="p-6 text-white">Signing you in…</div>;
}

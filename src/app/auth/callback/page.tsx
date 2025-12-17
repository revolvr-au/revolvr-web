"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

function safePath(p: string | null | undefined, fallback: string) {
  if (!p) return fallback;
  // prevent open-redirects; allow only internal paths
  return p.startsWith("/") ? p : fallback;
}

function getCookie(name: string) {
  const v = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
  return v ? decodeURIComponent(v) : null;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // redirectTo priority: query param -> cookie -> intent -> default
        const redirectFromQuery = url.searchParams.get("redirectTo");
        const redirectFromCookie = getCookie("revolvr_redirectTo");
        const intent = getCookie("revolvr_intent");

        const redirectTo = safePath(
          redirectFromQuery || redirectFromCookie || null,
          intent === "creator" ? "/creator/onboard" : "/public-feed"
        );

        if (!code) {
          router.replace("/login");
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[auth/callback] exchangeCodeForSession error", error);
          router.replace("/login");
          return;
        }

        router.replace(redirectTo);
      } catch (e) {
        console.error("[auth/callback] unexpected error", e);
        router.replace("/login");
      }
    };

    run();
  }, [router]);

  return <div className="p-6 text-white">Signing you in…</div>;
}

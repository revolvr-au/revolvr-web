"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export const dynamic = "force-dynamic";

function safePath(p: string | null | undefined, fallback: string) {
  if (!p) return fallback;
  if (!p.startsWith("/")) return fallback; // prevent open redirects
  return p;
}

function getCookie(name: string) {
  const v = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
  return v ? decodeURIComponent(v) : null;
}

function clearCookie(name: string) {
  // Clear for both http + https; keep it simple
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      const qs = new URLSearchParams(window.location.search);

      const code = qs.get("code");
      const redirectToParam = qs.get("redirectTo");

      // Priority:
      // 1) explicit redirectTo in URL
      // 2) redirectTo cookie saved by /login
      // 3) intent cookie fallback
      const cookieRedirect = getCookie("revolvr_redirectTo");
      const intent = getCookie("revolvr_intent");

      const fallback =
        intent === "creator" ? "/creator/onboard" : "/public-feed";

      const redirectTo = safePath(
        redirectToParam ?? cookieRedirect,
        fallback
      );

      if (!code) {
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[auth/callback] exchangeCodeForSession error", error);
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      // Optional cleanup to stop loops
      clearCookie("revolvr_redirectTo");
      clearCookie("revolvr_intent");

      router.replace(redirectTo);
    };

    run();
  }, [router]);

  return <div className="p-6 text-white">Signing you in…</div>;
}

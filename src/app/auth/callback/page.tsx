"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

function safeInternalPath(p: string | null | undefined, fallback: string) {
  if (!p) return fallback;
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

    (async () => {
      const url = new URL(window.location.href);

      const redirectFromQuery = url.searchParams.get("redirectTo");
      const redirectFromCookie = getCookie("revolvr_redirectTo");
      const redirectTo = safeInternalPath(
        redirectFromQuery || redirectFromCookie,
        "/public-feed"
      );

      const errorDesc =
        url.searchParams.get("error_description") || url.searchParams.get("error");
      if (errorDesc) {
        console.error("[auth/callback] Supabase returned error:", errorDesc);
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      // Magic link OTP style
      const token_hash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") || "magiclink";

      if (token_hash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });

        if (error) {
          console.error("[auth/callback] verifyOtp error", error);
          router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
          return;
        }

        router.replace(redirectTo);
        return;
      }

      // Fallback: PKCE code style (only if present)
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("[auth/callback] exchangeCodeForSession error", error);
          router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
          return;
        }

        router.replace(redirectTo);
        return;
      }

      // Nothing usable in URL
      router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
    })().catch((e) => {
      console.error("[auth/callback] unexpected error", e);
      router.replace("/login");
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-6">
      Signing you in…
    </div>
  );
}

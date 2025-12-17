// src/app/auth/callback/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

function safeInternalPath(p: string | null | undefined, fallback: string) {
  if (!p) return fallback;
  if (!p.startsWith("/")) return fallback; // prevent open redirects
  return p;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
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

        // Desired landing page (query param wins, then cookie, then default)
        const redirectFromQuery = url.searchParams.get("redirectTo");
        const redirectFromCookie = getCookie("revolvr_redirectTo");
        const redirectTo = safeInternalPath(
          redirectFromQuery || redirectFromCookie,
          "/public-feed"
        );

        // If Supabase included an explicit error in the URL
        const errorDesc =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error");
        if (errorDesc) {
          console.error("[auth/callback] Supabase returned error:", errorDesc);
          router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
          return;
        }

        // Supabase may send either:
        // A) PKCE flow: ?code=...
        // B) Magic link flow: ?token_hash=...&type=magiclink (type sometimes missing)
        const code = url.searchParams.get("code");
        const token_hash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type") || "magiclink";

        // Case A: PKCE code exchange
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

        // Case B: Magic link (OTP) verification
        if (token_hash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any, // "magiclink"
          });

          if (error) {
            console.error("[auth/callback] verifyOtp error", error);
            router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
            return;
          }

          router.replace(redirectTo);
          return;
        }

        // If neither is present, we have nothing to complete.
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      } catch (e) {
        console.error("[auth/callback] unexpected error", e);
        router.replace("/login");
      }
    };

    run();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-6">
      Signing you in…
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const supabase = createSupabaseBrowserClient();

const safeRedirect = (v: string | null) => {
  if (!v) return "/creator/dashboard";
  if (!v.startsWith("/")) return "/creator/dashboard";
  if (v.startsWith("//")) return "/creator/dashboard";
  if (v.includes("\\")) return "/creator/dashboard";
  return v;
};

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const code = searchParams?.get("code");
      const redirectTo = safeRedirect(searchParams?.get("redirectTo"));

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}&error=otp_invalid_or_expired`);
            return;
          }
        }

        // Clean redirect so params don't linger
        router.replace(redirectTo);
      } catch {
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}&error=otp_exchange_failed`);
      }
    };

    run();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-black/40 border border-white/10 p-6 text-sm text-white/80">
        Signing you in…
      </div>
    </div>
  );
}

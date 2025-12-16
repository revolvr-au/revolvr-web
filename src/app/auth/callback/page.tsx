"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

function safeRedirect(path: string | null) {
  if (!path) return "/public-feed";
  return path.startsWith("/") ? path : "/public-feed";
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const redirectTo = safeRedirect(url.searchParams.get("redirectTo"));

      if (!code) {
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      router.replace(redirectTo);
    };

    run();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-6">
      Signing you in…
    </div>
  );
}

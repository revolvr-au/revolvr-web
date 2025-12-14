"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"; // if using this

export default function CallbackClient() {
  const router = useRouter();
  // const supabase = createClientComponentClient();

  useEffect(() => {
    (async () => {
      // 1) Perform the exchange / session establishment here (provider-specific)
      // await supabase.auth.exchangeCodeForSession(window.location.search);

      // 2) Then confirm session exists before leaving the page
      // const { data } = await supabase.auth.getSession();
      // if (!data.session) { ...show error...; return; }

      // 3) Only then redirect
      router.replace("/public-feed");

      // 4) Force Next to re-fetch server components with fresh cookies
      router.refresh();
    })();
  }, [router]);

  return <div>Completing sign-in…</div>;
}

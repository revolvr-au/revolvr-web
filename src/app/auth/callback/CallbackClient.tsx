"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      router.replace(`/auth/login?error=${encodeURIComponent(error)}`);
      return;
    }

    // Do your callback logic here (exchange code, call API, etc.)
    // Then redirect:
    router.replace("/app");
  }, [router, searchParams]);

  return <div>Completing sign-in…</div>;
}

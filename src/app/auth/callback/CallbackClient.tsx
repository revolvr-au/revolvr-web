"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return; // TS + safety

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      router.replace(`/auth/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code) {
      router.replace("/auth/login?error=missing_code");
      return;
    }

    router.replace("/app");
  }, [router, searchParams]);

  return <div>Completing sign-in…</div>;
}

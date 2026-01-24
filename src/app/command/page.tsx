"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CommandPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/creator/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        const email = (json?.user?.email || "").toLowerCase();

        if (cancelled) return;

        if (!json?.loggedIn || !email) {
          router.replace("/login?redirectTo=/command");
          return;
        }

        router.replace(`/u/${encodeURIComponent(email)}`);
      } catch {
        router.replace("/login?redirectTo=/command");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}

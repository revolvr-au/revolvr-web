"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type CreatorMeResponse = {
  loggedIn?: boolean;
  ok?: boolean;
  creator?: {
    isActive?: boolean;
    handle?: string | null;
  };
  profile?: {
    status?: string;
    handle?: string | null;
  } | null;
};

export default function CreatorGate() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // 1) Must have a session
        const { data: sess } = await supabase.auth.getSession();
        const session = sess.session;

        if (!session) {
          router.replace("/login?redirectTo=%2Fcreator");
          return;
        }

        // 2) Ask server what creator state is
        const res = await fetch("/api/creator/me", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as CreatorMeResponse;

        // Treat “not logged in” as no session (cookie mismatch)
        const isLoggedIn =
          data.loggedIn === true || data.ok === true || res.status === 200;

        if (!isLoggedIn) {
          router.replace("/login?redirectTo=%2Fcreator");
          return;
        }

        // Prefer “creator” shape, fallback to “profile” shape
        const handle =
          data.creator?.handle ?? data.profile?.handle ?? null;

        const isActive =
          data.creator?.isActive ??
          (data.profile?.status ? data.profile.status === "ACTIVE" : false);

        if (!handle || !isActive) {
          router.replace("/creator/onboard");
          return;
        }

        router.replace("/creator/dashboard");
      } catch (e) {
        // Any unexpected failure: go to login with explicit redirect target
        router.replace("/login?redirectTo=%2Fcreator");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (!loading) return null;

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-xl font-semibold">Loading creator…</div>
        <div className="text-white/60 text-sm mt-2">Checking your session</div>
      </div>
    </div>
  );
}

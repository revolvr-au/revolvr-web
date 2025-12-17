"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import CreatorDashboard from "./_dashboard";

type CreatorMeResponse = {
  ok: boolean;
  profile: {
    status?: string;
    displayName?: string;
    display_name?: string;
    handle?: string;
  } | null;
  balance?: {
    creatorEmail: string;
    totalEarnedCents: number;
    availableCents: number;
  } | null;
};

export default function CreatorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<CreatorMeResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const { data, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const user = data.user;

        // Not logged in -> login, but come back to /creator
        if (!user?.email) {
          router.replace(`/login?redirectTo=${encodeURIComponent("/creator")}`);
          return;
        }

        const email = user.email.toLowerCase().trim();

        // Server decides if creator is ACTIVE (creator_profiles)
        const res = await fetch(`/api/creator/me?email=${encodeURIComponent(email)}`, {
          cache: "no-store",
        });

        const json = (await res.json()) as CreatorMeResponse;
        if (!mounted) return;

        const status = (json?.profile?.status || "").toUpperCase();

        // Not an ACTIVE creator -> onboarding
        if (!res.ok || !json?.ok || status !== "ACTIVE") {
          router.replace("/creator/onboard");
          return;
        }

        setMe(json);
      } catch (e) {
        router.replace("/creator/onboard");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return <div className="min-h-screen p-6">Loading creator dashboard…</div>;
  }

  if (!me) return null;
    return (
      <div className="min-h-screen p-6">
        <div className="text-lg font-semibold">Creator not ready</div>
        <div className="mt-2 opacity-70">Redirecting to creator onboarding…</div>
      </div>
    );
  }

  return <CreatorDashboard me={me} />;
}

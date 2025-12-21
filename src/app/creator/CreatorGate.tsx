"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardClient from "./DashboardClient"; // Ensure casing matches file name

type MeResponse = {
  loggedIn: boolean;
  creator: {
    isActive: boolean;
    handle: string | null;
    stripeOnboardingComplete: boolean;
  };
};

export default function CreatorGate() {
  const router = useRouter();
  const [state, setState] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/creator/me", { cache: "no-store" });
        const data = (await res.json()) as MeResponse;
        setState(data);

        if (!data.loggedIn) {
          router.replace("/login");
          return;
        }

        if (!data.creator?.isActive) {
          router.replace("/creator/onboard");
          return;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white p-8">
        <h1 className="text-2xl font-semibold">Creator</h1>
        <p className="mt-2 text-white/70">Loading…</p>
      </div>
    );
  }

  // If they aren't active we already redirected; keep this safe
  if (!state?.creator?.isActive) return null;

  return <DashboardClient />;
}

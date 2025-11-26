"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";

export default function HomePage() {
  const router = useRouter();
  const { session, loading } = useSupabaseAuth();

  // Decide where to send the user:
  // - logged in → dashboard
  // - logged out → public feed
  useEffect(() => {
    if (loading) return;

    if (session) {
      router.replace("/dashboard");
    } else {
      router.replace("/feed");
    }
  }, [loading, session, router]);

  // Simple loading state while deciding
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <p>Loading Revolvr…</p>
    </main>
  );
}

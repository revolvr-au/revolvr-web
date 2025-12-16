"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";



export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // If Supabase drops us on "/" with ?code=..., forward to callback handler.
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      window.location.replace(`/auth/callback${url.search}`);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-semibold tracking-tight">Revolvr</h1>
        <p className="text-white/70">Live support. Real momentum.</p>

        <div className="space-y-3">
          <button
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-4"
            onClick={() => {
              setIntentCookie("watch");
              router.push("/public-feed");
            }}
          >
            Watch Live
          </button>

          <button
            className="w-full rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold py-4"
            onClick={() => {
              // THIS is the missing piece: persist "creator" intent across the email hop
              setIntentCookie("creator");
              router.push(`/login?redirectTo=${encodeURIComponent("/creator/onboard")}`);
            }}
          >
            Go Live as a Creator
          </button>
        </div>

        <p className="text-white/60 text-sm">
          Creators earn <span className="font-semibold text-white">45%</span> on all tips, boosts, and
          spins.
        </p>
      </div>
    </div>
  );
}

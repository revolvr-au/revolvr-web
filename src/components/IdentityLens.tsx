"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type IdentityLensProps = {
  open: boolean;
  onClose: () => void;
  userEmail: string;
};

export default function IdentityLens({ open, onClose, userEmail }: IdentityLensProps) {
  const [postsCount, setPostsCount] = useState(0);
  const [boostsCount, setBoostsCount] = useState(0);
  const [spinsCount, setSpinsCount] = useState(0);
  const [impactScore, setImpactScore] = useState(0);
  const [recentSpins, setRecentSpins] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;

    async function loadStats() {
      // Posts
      const { count: pc } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_email", userEmail);

      // Boosts
      const { count: bc } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_email", userEmail)
        .eq("is_boosted", true);

      // Spins
      const { data: spins } = await supabase
        .from("spinner_spins")
        .select("*")
        .eq("user_email", userEmail)
        .order("created_at", { ascending: false });

      setPostsCount(pc ?? 0);
      setBoostsCount(bc ?? 0);
      setSpinsCount(spins?.length ?? 0);
      setRecentSpins(spins ?? []);

      const impact = (pc ?? 0) + (bc ?? 0) + (spins?.length ?? 0);
      setImpactScore(impact);
    }

    loadStats();
  }, [open, userEmail]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050816] text-white overflow-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <h2 className="text-xl font-semibold">Your Profile</h2>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white text-sm"
        >
          Close
        </button>
      </div>

      <div className="px-4 py-6 space-y-8 max-w-xl mx-auto">

        {/* Header */}
        <div className="space-y-1">
          <p className="text-lg font-medium">{userEmail}</p>
          <p className="text-xs text-white/60">Member since 2025</p>
        </div>

        {/* Social Energy Bar */}
        <div className="space-y-2">
          <p className="text-sm text-white/70">Social Energy</p>
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
              style={{ width: `${Math.min(impactScore, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-white/50">{impactScore}% activity</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Posts", value: postsCount },
            { label: "Boosts", value: boostsCount },
            { label: "Spins", value: spinsCount },
            { label: "Impact", value: impactScore },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
            >
              <p className="text-xs text-white/60">{item.label}</p>
              <p className="text-xl font-semibold mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <p className="text-sm text-white/70">Recent Spins</p>

          {recentSpins.length === 0 && (
            <p className="text-xs text-white/50">No spins yet</p>
          )}

          {recentSpins.map((spin, idx) => (
            <div
              key={idx}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs"
            >
              Spin • A$1 • {new Date(spin.created_at).toLocaleString()}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            onClose();
            window.location.href = "/feed";
          }}
          className="w-full mt-6 py-3 bg-red-600 hover:bg-red-500 rounded-full text-sm font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

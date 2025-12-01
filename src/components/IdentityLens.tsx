"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

type IdentityLensProps = {
  open: boolean;
  onClose: () => void;
  userEmail: string | null;
};

type Stats = {
  posts: number;
  spins: number;
};

export default function IdentityLens({ open, onClose, userEmail }: IdentityLensProps) {
  const [stats, setStats] = useState<Stats>({ posts: 0, spins: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userEmail) return;

    const load = async () => {
      try {
        setLoading(true);

        const [{ count: postCount }, { count: spinCount }] = await Promise.all([
          supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("user_email", userEmail),
          supabase
            .from("spinner_spins")
            .select("id", { count: "exact", head: true })
            .eq("user_email", userEmail),
        ]);

        setStats({
          posts: postCount ?? 0,
          spins: spinCount ?? 0,
        });
      } catch (err) {
        console.error("[IdentityLens] load error", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, userEmail]);

  if (!open) return null;

  const initial = userEmail?.[0]?.toUpperCase() ?? "R";

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/60 backdrop-blur-sm">
      {/* Click-off zone */}
      <button
        type="button"
        aria-label="Close identity lens"
        className="flex-1 h-full cursor-pointer"
        onClick={onClose}
      />

      {/* Side panel */}
      <div className="relative h-full w-full max-w-md bg-[#050816] border-l border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-semibold text-black">
              {initial}
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-white/50">
                Identity Lens
              </span>
              <span className="text-sm font-medium text-white">
                {userEmail ?? "Unknown user"}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-xs text-white/60 hover:text-white px-2 py-1 rounded-full hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Quick stats */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                Creator snapshot
              </span>
              <span className="text-[10px] text-white/40">v0.1 preview</span>
            </div>

            {loading ? (
              <p className="text-xs text-white/60">Loading your stats…</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2">
                  <div className="text-[11px] text-white/50">Posts</div>
                  <div className="text-lg font-semibold">
                    {stats.posts}
                  </div>
                </div>
                <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2">
                  <div className="text-[11px] text-white/50">Paid spins</div>
                  <div className="text-lg font-semibold">
                    {stats.spins}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Coming soon */}
          <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3 space-y-3">
            <h3 className="text-sm font-medium">Coming next</h3>
            <ul className="space-y-1 text-xs text-white/65">
              <li>• Reputation score based on spins & boosts</li>
              <li>• Simple profile card you can share</li>
              <li>• Audience breakdown once we go live</li>
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}

// src/app/u/[email]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type Post = {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
  tip_count?: number;
  boost_count?: number;
  spin_count?: number;
};

type ProfileProps = {
  params: { email: string };
};

export default function CreatorProfilePage({ params }: ProfileProps) {
  const router = useRouter();
  const creatorEmail = decodeURIComponent(params.email);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Load current user (for bottom nav Profile button)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserEmail(user?.email ?? null);
      } catch (e) {
        console.error("Error loading auth user on profile page", e);
      }
    };
    loadUser();
  }, []);

  // Load this creator's posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("posts")
          .select(
            "id, image_url, caption, created_at, tip_count, boost_count, spin_count"
          )
          .eq("user_email", creatorEmail)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setPosts(
          (data ?? []).map((row: any) => ({
            id: row.id,
            image_url: row.image_url,
            caption: row.caption,
            created_at: row.created_at,
            tip_count: row.tip_count ?? 0,
            boost_count: row.boost_count ?? 0,
            spin_count: row.spin_count ?? 0,
          }))
        );
      } catch (e) {
        console.error("Error loading creator profile", e);
        setError("Revolvr glitched out loading this profile 😵‍💫");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [creatorEmail]);

  const displayName = useMemo(() => {
    if (!creatorEmail) return "Someone";

    const [localPart] = creatorEmail.split("@");
    const cleaned = localPart.replace(/\W+/g, " ").trim();

    return cleaned || creatorEmail;
  }, [creatorEmail]);

  const avatarLetter = displayName[0]?.toUpperCase() ?? "R";

  const stats = useMemo(() => {
    let postsCount = posts.length;
    let tips = 0;
    let boosts = 0;
    let spins = 0;

    for (const p of posts) {
      tips += p.tip_count ?? 0;
      boosts += p.boost_count ?? 0;
      spins += p.spin_count ?? 0;
    }

    return { postsCount, tips, boosts, spins };
  }, [posts]);

  const ensureLoggedIn = () => {
    if (!currentUserEmail) {
      const redirect = encodeURIComponent(`/u/${encodeURIComponent(creatorEmail)}`);
      router.push(`/login?redirectTo=${redirect}`);
      return false;
    }
    return true;
  };

  const handleBottomPost = () => {
    if (!ensureLoggedIn()) return;
    // go back to feed and open composer – same pattern as feed page
    router.push("/public-feed");
  };

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col pb-20 sm:pb-24">
      {/* Top bar / back */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050814]/90 backdrop-blur px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/public-feed")}
          className="text-xs sm:text-sm text-white/70 hover:text-white flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to feed</span>
        </button>
        <span className="text-xs text-white/40">Profile</span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-4xl px-4 py-6 space-y-8">
          {/* Error banner */}
          {error && (
            <div className="rounded-xl bg-red-500/10 text-red-200 text-sm px-3 py-2 flex justify-between items-center shadow-sm shadow-red-500/20">
              <span>{error}</span>
              <button
                className="text-xs underline"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Header card */}
          <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-emerald-600/25 flex items-center justify-center text-2xl font-semibold text-emerald-200">
                {avatarLetter}
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-semibold">
                  {displayName}
                </h1>
                <p className="text-xs sm:text-sm text-white/50 truncate max-w-[260px] sm:max-w-none">
                  {creatorEmail}
                </p>
              </div>
            </div>
          </section>

          {/* Stats row */}
          <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 py-4 px-4 text-center">
              <div className="text-2xl font-semibold">{stats.postsCount}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/50">
                Posts
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 py-4 px-4 text-center">
              <div className="text-2xl font-semibold">{stats.tips}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/50">
                Tips
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 py-4 px-4 text-center">
              <div className="text-2xl font-semibold">{stats.boosts}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/50">
                Boosts
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 py-4 px-4 text-center">
              <div className="text-2xl font-semibold">{stats.spins}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/50">
                Spins
              </div>
            </div>
          </section>

          {/* Posts grid */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-white/80">
              POSTS
            </h2>

            {isLoading ? (
              <div className="text-sm text-white/60 py-8">
                Loading this creator&apos;s chaos…
              </div>
            ) : posts.length === 0 ? (
              <div className="text-sm text-white/60 py-8">
                No posts yet from this creator.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="relative overflow-hidden rounded-xl bg-black/40 border border-white/10"
                  >
                    <img
                      src={post.image_url}
                      alt={post.caption ?? ""}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Bottom app nav – same structure as feed */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#050814]/95 backdrop-blur">
        <div className="mx-auto max-w-xl px-6 py-2 flex items-center justify-between text-xs sm:text-sm">
          {/* Feed */}
          <button
            type="button"
            onClick={() => router.push("/public-feed")}
            className="flex flex-col items-center flex-1 text-white/70 hover:text-white"
          >
            <span className="text-lg">🏠</span>
            <span className="mt-0.5">Feed</span>
          </button>

          {/* Post */}
          <button
            type="button"
            onClick={handleBottomPost}
            className="flex flex-col items-center flex-1 text-emerald-300 hover:text-emerald-100"
          >
            <span className="text-lg">➕</span>
            <span className="mt-0.5">Post</span>
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => {
              if (!currentUserEmail) {
                const redirect = encodeURIComponent(
                  `/u/${encodeURIComponent(creatorEmail)}`
                );
                router.push(`/login?redirectTo=${redirect}`);
                return;
              }
              router.push(`/u/${encodeURIComponent(currentUserEmail)}`);
            }}
            className="flex flex-col items-center flex-1 text-emerald-300"
          >
            <span className="text-lg">👤</span>
            <span className="mt-0.5">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClients";

type Post = {
  id: string;
  user_email: string;
  image_url: string;
  caption: string;
  created_at: string;
  tip_count?: number;
  boost_count?: number;
  spin_count?: number;
};

export default function UserProfilePage() {
  const params = useParams<{ email: string }>();
  const router = useRouter();

  const encodedEmail = params?.email ?? "";
  const email = decodeURIComponent(encodedEmail);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;

    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("posts")
          .select(
            "id, user_email, image_url, caption, created_at, tip_count, boost_count, spin_count"
          )
          .eq("user_email", email)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setPosts(
          (data ?? []).map((row: any) => ({
            id: row.id,
            user_email: row.user_email,
            image_url: row.image_url,
            caption: row.caption,
            created_at: row.created_at,
            tip_count: row.tip_count ?? 0,
            boost_count: row.boost_count ?? 0,
            spin_count: row.spin_count ?? 0,
          }))
        );
      } catch (e) {
        console.error("Error loading user profile", e);
        setError("Revolvr glitched out loading this creator 😵‍💫");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [email]);

  const displayName = useMemo(() => {
    if (!email) return "Someone";
    const local = email.split("@")[0] ?? "";
    const cleaned = local.replace(/\W+/g, " ").trim();
    return cleaned || email;
  }, [email]);

  const stats = useMemo(() => {
    return posts.reduce(
      (acc, p) => {
        acc.posts += 1;
        acc.tips += p.tip_count ?? 0;
        acc.boosts += p.boost_count ?? 0;
        acc.spins += p.spin_count ?? 0;
        return acc;
      },
      { posts: 0, tips: 0, boosts: 0, spins: 0 }
    );
  }, [posts]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050814]/90 backdrop-blur flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/public-feed")}
            className="text-xs text-white/60 hover:text-white flex items-center gap-1"
          >
            <span className="text-lg leading-none">←</span>
            <span>Back</span>
          </button>
        </div>
        <Link
          href="/public-feed"
          className="text-xs sm:text-sm text-white/60 hover:text-white"
        >
          Revolvr 🔥
        </Link>
      </header>

      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-xl px-3 sm:px-0 py-4 space-y-4">
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

          {/* Profile header */}
          <section className="rounded-2xl bg-[#070b1b] border border-white/10 p-4 shadow-md shadow-black/30 flex gap-3">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-emerald-500/15 flex items-center justify-center text-lg font-semibold text-emerald-300 uppercase">
              {email ? email[0] : "R"}
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-base sm:text-lg font-semibold text-white/90 truncate">
                {displayName}
              </h1>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                {email || "Unknown creator"}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/60">
                <span>
                  {stats.posts} post{stats.posts === 1 ? "" : "s"}
                </span>
                <span>
                  💸 {stats.tips} tip{stats.tips === 1 ? "" : "s"}
                </span>
                <span>
                  🚀 {stats.boosts} boost{stats.boosts === 1 ? "" : "s"}
                </span>
                <span>
                  🌀 {stats.spins} spin{stats.spins === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </section>

          {/* Posts list */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-white/80">
                POSTS
              </h2>
            </div>

            {isLoading ? (
              <div className="text-center text-sm text-white/60 py-10">
                Loading their chaos…
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center text-sm text-white/60 py-10">
                No posts yet from this creator.
              </div>
            ) : (
              <div className="space-y-4 pb-10">
                {posts.map((post) => {
                  const created = new Date(post.created_at);
                  const timeLabel = created.toLocaleDateString();

                  const isVideo = !!post.image_url?.match(
                    /\.(mp4|webm|ogg)$/i
                  );

                  return (
                    <article
                      key={post.id}
                      className="rounded-2xl bg-[#070b1b] border border-white/10 p-3 sm:p-4 shadow-md shadow-black/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-white/40">
                          {timeLabel}
                        </span>
                      </div>
                      <div className="overflow-hidden rounded-xl bg-black/40">
                        {isVideo ? (
                          <video
                            src={post.image_url}
                            className="w-full h-auto block"
                            controls
                            playsInline
                          />
                        ) : (
                          <img
                            src={post.image_url}
                            alt={post.caption}
                            className="w-full h-auto block"
                          />
                        )}
                      </div>
                      {post.caption && (
                        <p className="mt-2 text-sm text-white/90 break-words">
                          {post.caption}
                        </p>
                      )}
                      {(post.tip_count ?? 0) +
                        (post.boost_count ?? 0) +
                        (post.spin_count ?? 0) > 0 && (
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/60">
                          {!!post.tip_count && (
                            <span>
                              💸 {post.tip_count} tip
                              {post.tip_count === 1 ? "" : "s"}
                            </span>
                          )}
                          {!!post.boost_count && (
                            <span>
                              🚀 {post.boost_count} boost
                              {post.boost_count === 1 ? "" : "s"}
                            </span>
                          )}
                          {!!post.spin_count && (
                            <span>
                              🌀 {post.spin_count} spin
                              {post.spin_count === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

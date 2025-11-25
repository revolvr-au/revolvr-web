"use client";

import { supabase } from "@/app/lib/supabaseClients";
import React, { useEffect, useMemo, useState } from "react";

type Post = {
  id: string;
  user_email: string;
  image_url: string;
  caption: string;
  created_at: string;
  reactions?: Record<string, number>;
};

const REACTION_EMOJIS = ["🔥", "💀", "😂", "🤪", "🥴"];

export default function DashboardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error(error);
          return;
        }
        setUserEmail(data.user?.email ?? null);
      } catch (e) {
        console.error(e);
      }
    };

    getUser();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from("posts")
          .select("id, user_email, image_url, caption, created_at, reactions")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setPosts(
          (data ?? []).map((row: any) => ({
            id: row.id,
            user_email: row.user_email,
            image_url: row.image_url,
            caption: row.caption,
            created_at: row.created_at,
            reactions: row.reactions ?? {},
          }))
        );
      } catch (e) {
        console.error(e);
        setError("Revolvr glitched out while loading the feed 😵‍💫");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  };

  const handleCreatePost = async () => {
    if (!file) {
      setError("Add a photo before posting 🤪");
      return;
    }

    if (!userEmail) {
      setError("Revolvr doesn’t know who you are yet. Try reloading 😵‍💫");
      return;
    }

    try {
      setIsPosting(true);
      setError(null);

      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${userEmail}/${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from("post-images")
        .upload(filePath, file);

      if (storageError) throw storageError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("post-images").getPublicUrl(storageData.path);

      const { data, error: insertError } = await supabase
        .from("posts")
        .insert({
          user_email: userEmail,
          image_url: publicUrl,
          caption,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newPost: Post = {
        id: data.id,
        user_email: data.user_email,
        image_url: data.image_url,
        caption: data.caption,
        created_at: data.created_at,
        reactions: data.reactions ?? {},
      };

      setPosts((prev) => [newPost, ...prev]);
      setCaption("");
      setFile(null);
      setShowComposer(false);
    } catch (e) {
      console.error(e);
      setError("Revolvr glitched out while posting 😵‍💫 Try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      setError("Revolvr glitched out deleting that post 😵‍💫");
    }
  };

  const handleReact = async (postId: string, emoji: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              reactions: {
                ...(p.reactions ?? {}),
                [emoji]: (p.reactions?.[emoji] ?? 0) + 1,
              },
            }
          : p
      )
    );

    try {
      // TODO: persist reactions to your backend if needed
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050814]/90 backdrop-blur flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">Revolvr</span>
          <span className="text-lg">🔥</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
          <span className="hidden sm:inline">Signed in as</span>
          <span className="font-medium">{userEmail ?? "mystery user"}</span>
        </div>
      </header>

      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-xl px-3 sm:px-0 py-4 space-y-3">
          {error && (
            <div className="rounded-xl bg-red-500/10 text-red-200 text-sm px-3 py-2 flex justify-between items-center">
              <span>{error}</span>
              <button
                className="text-xs underline"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-1 mb-1">
            <h1 className="text-base font-semibold text-white/90">Live feed</h1>
            <span className="text-xs text-white/50">v0.1 · social preview</span>
          </div>

          {isLoading ? (
            <div className="text-center text-sm text-white/60 py-10">
              Loading the chaos…
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center text-sm text-white/60 py-10">
              No posts yet. Be the first to spin something into existence ✨
            </div>
          ) : (
            <div className="space-y-4 pb-20">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={() => handleDeletePost(post.id)}
                  onReact={handleReact}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <button
        onClick={() => setShowComposer(true)}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/40 transition flex items-center justify-center text-3xl"
        aria-label="Create post"
      >
        +
      </button>

      {showComposer && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center px-3">
          <div className="w-full max-w-md rounded-2xl bg-[#070b1b] border border-white/10 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New post</h2>
              <button
                className="text-sm text-white/60 hover:text-white"
                onClick={() => !isPosting && setShowComposer(false)}
              >
                Close
              </button>
            </div>

            <label className="block border border-dashed border-white/20 rounded-xl p-4 text-sm text-white/60 cursor-pointer hover:border-emerald-400/70 hover:text-white transition">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <span className="font-medium text-emerald-300">
                  {file.name}
                </span>
              ) : (
                <span>Tap to add a photo</span>
              )}
            </label>

            <input
              type="text"
              maxLength={140}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Say something wild…"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500"
            />

            <button
              onClick={handleCreatePost}
              disabled={isPosting}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition text-sm font-semibold py-2.5 disabled:opacity-60 disabled:hover:bg-emerald-500"
            >
              {isPosting ? "Posting…" : "Post to Revolvr"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type PostCardProps = {
  post: Post;
  onDelete: () => void;
  onReact: (postId: string, emoji: string) => void;
};

const PostCard: React.FC<PostCardProps> = ({ post, onDelete, onReact }) => {
  const [hasMounted, setHasMounted] = useState(false);
  const animationClass = useMemo(() => {
    const classes = [
      "rv-spin-in",
      "rv-bounce-in",
      "rv-jolt-in",
      "rv-glitch-in",
      "rv-slide-in",
    ];
    const random = Math.floor(Math.random() * classes.length);
    return classes[random];
  }, []);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const created = new Date(post.created_at);
  const timeLabel = created.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="rounded-2xl bg-[#070b1b] border border-white/10 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
            {post.user_email?.[0] ?? "R"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {post.user_email ?? "Someone"}
            </span>
            <span className="text-[11px] text-white/40">{timeLabel}</span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-[11px] text-white/50 hover:text-red-400"
        >
          •••
        </button>
      </div>

      <div
        className={`overflow-hidden rounded-xl bg-black/40 ${
          hasMounted ? animationClass : ""
        }`}
      >
        <img
          src={post.image_url}
          alt={post.caption}
          className="w-full h-auto block"
        />
      </div>

      {post.caption && (
        <p className="mt-2 text-sm text-white/90 break-words">
          {post.caption}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          {REACTION_EMOJIS.map((emoji) => {
            const count = post.reactions?.[emoji] ?? 0;
            return (
              <button
                key={emoji}
                onClick={() => onReact(post.id, emoji)}
                className="rv-emoji-button text-lg leading-none"
              >
                <span>{emoji}</span>
                {count > 0 && (
                  <span className="ml-1 text-[11px] text-white/60">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
};

"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type Post = {
  id: string;
  user_email: string;
  image_url: string;
  caption: string;
  created_at: string;
};

const REACTION_EMOJIS = ["🔥", "💀", "😂", "🤪", "🥴"] as const;

export default function PublicFeedPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Composer UI state
  const [composerOpen, setComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  // Load user session
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    };
    loadUser();
  }, []);

  // Load posts
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPosts(data ?? []);
      } catch (err) {
        console.error(err);
        setError("Revolvr glitched loading posts 😵‍💫");
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);

  // POST CREATION
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please upload an image or video.");
      return;
    }
    if (!userEmail) {
      router.push("/login?redirectTo=/public-feed");
      return;
    }

    try {
      setIsPosting(true);
      setError(null);

      // Upload file to Supabase Storage
      const ext = file.name.split(".").pop();
      const filePath = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { data: upload, error: uploadErr } = await supabase.storage
        .from("posts")
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("posts").getPublicUrl(upload.path);

      // Insert post
      const { data: inserted, error: insertErr } = await supabase
        .from("posts")
        .insert({
          user_email: userEmail,
          image_url: publicUrl,
          caption: caption.trim(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Update feed instantly
      setPosts((prev) => [inserted, ...prev]);

      // Reset composer
      setCaption("");
      setFile(null);
      setComposerOpen(false);
    } catch (err) {
      console.error(err);
      setError("Revolvr glitched posting 😵‍💫 Try again.");
    } finally {
      setIsPosting(false);
    }
  };

  // Drag + Drop Upload Component
  const UploadBlock = (
    <div className="space-y-2">
      <label className="text-xs font-medium text-white/70 block mb-1">
        Image or short video
      </label>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) setFile(dropped);
        }}
        className="w-full h-48 rounded-xl border border-white/15 bg-black/20 
                   flex flex-col items-center justify-center cursor-pointer 
                   hover:bg-black/30 transition"
        onClick={() => document.getElementById("uploadInput")?.click()}
      >
        {!file ? (
          <div className="flex flex-col items-center gap-2 text-white/60">
            <div className="w-12 h-12 border border-white/20 rounded-lg flex items-center justify-center">
              <span className="text-xl">↑</span>
            </div>
            <span className="text-xs">Click or drop to upload</span>
          </div>
        ) : (
          <div className="w-full h-full overflow-hidden rounded-lg">
            {file.type.startsWith("video") ? (
              <video
                src={URL.createObjectURL(file)}
                className="w-full h-full object-cover"
                controls
              />
            ) : (
              <img
                src={URL.createObjectURL(file)}
                className="w-full h-full object-cover"
                alt="preview"
              />
            )}
          </div>
        )}
      </div>

      <input
        id="uploadInput"
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <p className="text-[11px] text-white/40">
        Supported: JPG, PNG, GIF, MP4 (short clips work best)
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050814] text-white">
      {/* NAV BAR */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050814]/90 backdrop-blur flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-base">Revolvr</span>

        <div className="flex items-center gap-3">
          {/* Post Button */}
          <button
            onClick={() => setComposerOpen(true)}
            className="px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition"
          >
            + Post
          </button>

          {!userEmail ? (
            <Link
              href="/login?redirectTo=/public-feed"
              className="px-3 py-1 rounded-full border border-white/20 text-xs hover:bg-white/10"
            >
              Sign in
            </Link>
          ) : (
            <span className="text-xs text-white/70">{userEmail}</span>
          )}
        </div>
      </header>

      {/* COMPOSER */}
      {composerOpen && (
        <div className="max-w-xl mx-auto mt-4 mb-6 p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
          <h2 className="text-sm font-semibold">Create a Post</h2>

          {UploadBlock}

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Say something wild…"
            className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setComposerOpen(false)}
              className="px-3 py-1.5 rounded-full border border-white/20 text-xs hover:bg-white/10"
            >
              Cancel
            </button>

            <button
              onClick={handleCreatePost}
              disabled={isPosting}
              className="px-4 py-1.5 rounded-full bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 disabled:opacity-50"
            >
              {isPosting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}

      {/* FEED */}
      <main className="max-w-xl mx-auto px-3 pb-10">
        {isLoading ? (
          <p className="text-sm text-white/60 text-center py-10">
            Loading chaos…
          </p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-white/60 text-center py-10">
            Nothing yet — be the first ✨
          </p>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="rounded-xl bg-white/5 border border-white/10 p-3 mb-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
                  {post.user_email[0]}
                </div>
                <div className="text-xs text-white/60">
                  {post.user_email}
                </div>
              </div>

              {/* MEDIA */}
              {post.image_url.match(/\.(mp4|webm|ogg)$/i) ? (
                <video src={post.image_url} controls className="w-full rounded-xl" />
              ) : (
                <img
                  src={post.image_url}
                  alt={post.caption}
                  className="w-full rounded-xl"
                />
              )}

              {post.caption && (
                <p className="mt-2 text-sm">{post.caption}</p>
              )}
            </article>
          ))
        )}
      </main>
    </div>
  );
}

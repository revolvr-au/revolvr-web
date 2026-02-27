// src/app/creator/DashboardClient.tsx
"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import { useAuthedUser } from "@/lib/useAuthedUser";
import SpinButton from "@/components/SpinButton";
import IdentityLens from "@/components/IdentityLens";
import { RevolvrIcon } from "@/components/RevolvrIcon";
import { PaidReactionBar } from "@/components/PaidReactionBar";

const POSTS_TABLE = "Post";

type UserCredits = {
  boosts: number;
  tips: number;
  spins: number;
};

type Post = {
  id: string;
  userEmail: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  is_boosted?: boolean | null;
};

function isPost(value: any): value is Post {
  return (
    value &&
    typeof value.id === "string" &&
    typeof value.userEmail === "string" &&
    typeof value.imageUrl === "string"
  );
}

function toNumberOrZero(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export default function DashboardClient() {
  const router = useRouter();
  const { user, ready } = useAuthedUser();

  const userEmail = useMemo(() => {
    if (!ready) return null;
    return user?.email?.toLowerCase() ?? null;
  }, [ready, user]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLensOpen, setIsLensOpen] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);

  // 🔐 Auth Guard (no redirect loop)
  useEffect(() => {
    if (!ready) return;
    if (!userEmail) router.replace("/login?redirectTo=/creator");
  }, [ready, userEmail, router]);

  const loadPosts = useCallback(async () => {
    try {
      setIsLoadingPosts(true);
      const { data, error } = await supabase
        .from(POSTS_TABLE)
        .select("*")
        .order("createdAt", { ascending: false });

      if (error) throw error;
      setPosts((data ?? []).filter(isPost));
    } catch (e) {
      console.error(e);
      setError("Failed loading posts.");
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  const loadCredits = useCallback(async (email: string) => {
    try {
      const res = await fetch(`/api/credits?email=${encodeURIComponent(email)}`);
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      setCredits({
        boosts: toNumberOrZero(data?.boosts),
        tips: toNumberOrZero(data?.tips),
        spins: toNumberOrZero(data?.spins),
      });
    } catch {}
  }, []);

  useEffect(() => {
    if (!ready || !userEmail) return;
    loadPosts();
    loadCredits(userEmail);
  }, [ready, userEmail, loadPosts, loadCredits]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!userEmail || !file) return;

    try {
      setIsPosting(true);

      const fileExt = file.name.split(".").pop() ?? "bin";
      const filePath = `${Date.now()}-${Math.random().toString(36)}.${fileExt}`;

      const { data: uploadData, error: uploadErr } =
        await supabase.storage.from("posts").upload(filePath, file);

      if (uploadErr || !uploadData) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("posts").getPublicUrl(uploadData.path);

      const { data: inserted, error: insertErr } = await supabase
        .from(POSTS_TABLE)
        .insert({
          userEmail,
          imageUrl: publicUrl,
          caption: caption.trim(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      if (isPost(inserted)) setPosts((p) => [inserted, ...p]);

      setCaption("");
      setFile(null);
      setIsComposerOpen(false);
    } catch (err) {
      console.error(err);
      setError("Post failed.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleBoostPost = async (postId: string) => {
    if (!userEmail) return;

    try {
      const res = await fetch("/api/credits/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, postId, kind: "boost" }),
      });

      if (!res.ok) return;

      setPosts((p) =>
        p.map((post) =>
          post.id === postId ? { ...post, is_boosted: true } : post
        )
      );
    } catch {}
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#050816] text-white p-8">
        Loading...
      </div>
    );
  }

  if (!userEmail) return null;

  const avatarInitial = userEmail[0]?.toUpperCase() ?? "R";

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <RevolvrIcon name="boost" size={20} />
          <span className="text-lg font-semibold">Revolvr</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLensOpen(true)}
            className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-black"
          >
            {avatarInitial}
          </button>

          <button
            onClick={handleSignOut}
            className="px-3 py-1 rounded-full border border-white/20 text-xs"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && <div className="text-red-400 text-sm">{error}</div>}

        <button
          onClick={() => setIsComposerOpen(true)}
          className="px-4 py-2 bg-emerald-500 rounded-full text-sm"
        >
          New Post
        </button>

        {isLoadingPosts ? (
          <div>Loading feed…</div>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
            >
              <Image
                src={post.imageUrl}
                alt=""
                width={1000}
                height={700}
                className="w-full object-cover"
                unoptimized
              />

              {post.caption && (
                <p className="px-4 py-2 text-sm">{post.caption}</p>
              )}

              <div className="px-4 py-2 flex gap-3">
                <button
                  className="text-emerald-300 text-xs underline"
                  onClick={() => handleBoostPost(post.id)}
                >
                  Boost
                </button>
              </div>

              <PaidReactionBar
                postId={post.id}
                viewerEmail={userEmail}
              />
            </article>
          ))
        )}
      </main>

      {isComposerOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <form
            onSubmit={handleCreatePost}
            className="bg-[#050816] p-6 rounded-xl w-full max-w-md space-y-4"
          >
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-white/5 p-2 rounded"
            />
            <button
              type="submit"
              disabled={isPosting}
              className="bg-emerald-500 px-4 py-2 rounded"
            >
              Post
            </button>
          </form>
        </div>
      )}

      <IdentityLens
        open={isLensOpen}
        onClose={() => setIsLensOpen(false)}
        userEmail={userEmail}
      />
    </div>
  );
}
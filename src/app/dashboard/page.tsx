'use client';

import {
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '../../../hooks/useSupabaseAuth';
import { supabase } from '../../../lib/supabaseClient';

type Post = {
  id: string;
  userEmail: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  likedByMe?: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading } = useSupabaseAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect away if not logged in
  useEffect(() => {
    if (!loading && !session) {
      router.replace('/');
    }
  }, [loading, session, router]);

  // Fetch existing posts once we know we have a session
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/posts');
        if (!res.ok) throw new Error('Failed to fetch posts');
        const data: any[] = await res.json();

        setPosts(
          data.map((p) => ({
            ...p,
            likesCount: p.likesCount ?? 0,
            likedByMe: false,
          }))
        );
      } catch (err) {
        console.error(err);
        setError('Could not load posts.');
      }
    };

    if (!loading && session) {
      fetchPosts();
    }
  }, [loading, session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  // Create post: upload image to bucket "posts" then create DB record
  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!file || !caption.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload image to Supabase Storage (bucket: posts)
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `posts/${session.user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) {
        console.error(uploadError);
        throw new Error('Failed to upload image');
      }

      // 2. Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('posts').getPublicUrl(filePath);

      // 3. Create Post via API
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: caption.trim(),
          imageUrl: publicUrl,
          userEmail: session.user.email,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || 'Failed to create post');
      }

      const created: Post = await res.json();
      setPosts((prev) => [{ ...created, likedByMe: false }, ...prev]);

      // Reset form
      setCaption('');
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not create post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string, liked: boolean | undefined) => {
    if (!session) return;

    try {
      const res = await fetch('/api/likes', {
        method: liked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          userEmail: session.user.email,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || 'Failed to update like');
      }

      const { likesCount } = await res.json();

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likesCount, likedByMe: !liked } : p
        )
      );
    } catch (err) {
      console.error(err);
      setError('Could not update like.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!session) return;
    if (!window.confirm('Delete this post?')) return;

    try {
      const res = await fetch('/api/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          userEmail: session.user.email,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || 'Failed to delete post');
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error(err);
      setError('Could not delete post.');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p>Checking your session…</p>
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revolvr Feed</h1>
          <p className="mt-1 text-sm text-slate-400">
            A simple place to share images and captions with everyone on Revolvr.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>v0.1 · Social preview</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-slate-600 px-3 py-1 text-sm hover:border-slate-400"
          >
            Sign out
          </button>
        </div>
      </div>

      <p className="mb-6 text-sm text-slate-400">
        You&apos;re signed in as{' '}
        <span className="font-mono text-slate-200">{session.user.email}</span>.
      </p>

      {/* Create post */}
      <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-1 text-sm font-semibold tracking-[0.2em] text-slate-400">
          CREATE POST
        </h2>
        <p className="mb-4 text-sm text-slate-300">
          Upload one image and add a short caption. It will appear in the feed below.
        </p>

        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs text-slate-400">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="text-sm text-slate-200"
            />
          </div>

          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs text-slate-400">Caption</label>
            <textarea
              rows={3}
              placeholder="Write a short caption…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {submitting ? 'Posting…' : 'Post to feed'}
          </button>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </form>
      </section>

      {/* Feed */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-sm font-semibold tracking-[0.2em] text-slate-400">
          FEED · ALL POSTS
        </h2>

        {posts.length === 0 ? (
          <p className="text-sm text-slate-400">
            No one has posted yet. Be the first to share something.
          </p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li
                key={post.id}
                className="rounded-xl bg-slate-950/80 p-4 text-sm"
              >
                <div className="mb-2 flex justify-between text-xs text-slate-500">
                  <span>{post.userEmail}</span>
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                </div>
                <img
                  src={post.imageUrl}
                  alt={post.caption}
                  className="mb-2 w-full rounded-lg object-cover"
                />
                <p className="text-slate-200">{post.caption}</p>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleLike(post.id, post.likedByMe)
                      }
                      className={
                        post.likedByMe
                          ? 'font-medium text-emerald-400'
                          : 'font-medium text-slate-400 hover:text-emerald-300'
                      }
                    >
                      {post.likedByMe ? '♥ Liked' : '♡ Like'}
                    </button>
                    <span>
                      {post.likesCount} like
                      {post.likesCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  {post.userEmail === session.user.email && (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="text-xs text-slate-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

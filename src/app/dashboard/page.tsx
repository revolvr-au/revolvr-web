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
        const data: Post[] = await res.json();
        setPosts(data);
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

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (!file) {
      setError('Please choose an image.');
      return;
    }
    if (!caption.trim()) {
      setError('Please enter a caption.');
      return;
    }

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
      setPosts((prev) => [created, ...prev]);

      // Reset form
      setCaption('');
      setFile(null);
    } catch (err) {
      console.error(err);
      setError('Could not create post.');
    } finally {
      setSubmitting(false);
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

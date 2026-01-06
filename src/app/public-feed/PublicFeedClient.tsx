// src/app/public-feed/PublicFeedClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Post = {
  id: string;
  userEmail: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
};

type PostsResponseShape = { posts?: unknown };
type VerifiedResponseShape = { verified?: unknown };
type ErrorResponseShape = { error?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasPostsArray(v: unknown): v is PostsResponseShape {
  return isRecord(v) && "posts" in v;
}

function hasVerifiedArray(v: unknown): v is VerifiedResponseShape {
  return isRecord(v) && "verified" in v;
}

function hasErrorMessage(v: unknown): v is ErrorResponseShape {
  return isRecord(v) && "error" in v;
}

function normalizePosts(rows: unknown): Post[] {
  if (!Array.isArray(rows)) return [];
  // We trust our API contract here; keep the cast localized.
  return rows as Post[];
}

function normalizeVerifiedEmails(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).toLowerCase());
}

const VerifiedBadge = () => (
  <span
    title="Verified creator"
    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] ml-1"
    aria-label="Verified"
  >
    ✓
  </span>
);

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || email;
}

export default function PublicFeedClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [verifiedSet, setVerifiedSet] = useState<Set<string>>(new Set());

  const emails = useMemo(() => {
    const s = new Set<string>();
    for (const p of posts) {
      const e = String(p.userEmail || "").trim().toLowerCase();
      if (e) s.add(e);
    }
    return Array.from(s);
  }, [posts]);

  // 1) Load posts
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/posts", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as unknown;

        if (!res.ok) {
          const msg =
            hasErrorMessage(json) && typeof json.error === "string"
              ? json.error
              : `Failed to load posts (${res.status})`;

          if (!cancelled) {
            setErr(msg);
            setPosts([]);
          }
          return;
        }

        const rows = Array.isArray(json)
          ? json
          : hasPostsArray(json)
          ? (json.posts ?? [])
          : [];

        if (!cancelled) setPosts(normalizePosts(rows));
      } catch (e: unknown) {
        console.error("[public-feed] load posts error", e);
        if (!cancelled) {
          setErr("Failed to load public feed.");
          setPosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Load verified map for authors (batch call)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!emails.length) {
          if (!cancelled) setVerifiedSet(new Set());
          return;
        }

        // Safety cap to avoid huge query strings
        const batch = emails.slice(0, 200);
        const qs = encodeURIComponent(batch.join(","));

        const res = await fetch(`/api/creator/verified?emails=${qs}`, {
          cache: "no-store",
        });

        const json = (await res.json().catch(() => null)) as unknown;

        if (!res.ok) {
          console.warn("[public-feed] verified lookup failed", res.status, json);
          return;
        }

        const verifiedRaw =
          hasVerifiedArray(json) ? (json.verified ?? []) : [];

        const verified = normalizeVerifiedEmails(verifiedRaw);

        if (!cancelled) {
          setVerifiedSet(new Set(verified));
        }
      } catch (e: unknown) {
        console.warn("[public-feed] verified lookup error", e);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [emails]);

  if (loading) {
    return <div className="text-sm text-white/70">Loading public feed…</div>;
  }

  if (err) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-400/20 text-red-200 text-sm px-3 py-2">
        {err}
      </div>
    );
  }

  if (!posts.length) {
    return <div className="text-sm text-white/70">No posts yet.</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {posts.map((post) => {
        const email = String(post.userEmail || "").trim().toLowerCase();
        const isVerified = email ? verifiedSet.has(email) : false;

        return (
          <article
            key={post.id}
            className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg shadow-black/40"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
                  {(email || "r")[0].toUpperCase()}
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate max-w-[180px] sm:max-w-[240px] inline-flex items-center">
                    {displayNameFromEmail(email)}
                    {isVerified ? <VerifiedBadge /> : null}
                  </span>
                  <span className="text-[11px] text-white/40">
                    {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
                  </span>
                </div>
              </div>

              <a
                href={`/u/${encodeURIComponent(email)}`}
                className="text-xs text-white/60 hover:text-white underline"
              >
                View
              </a>
            </div>

            {/* Media */}
            <div className="relative w-full max-h-[520px]">
              <Image
                src={post.imageUrl}
                alt={post.caption || "post"}
                width={1200}
                height={800}
                unoptimized
                className="w-full max-h-[520px] object-cover"
              />
            </div>

            {/* Caption */}
            {post.caption ? (
              <p className="px-4 py-3 text-sm text-white/90">{post.caption}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

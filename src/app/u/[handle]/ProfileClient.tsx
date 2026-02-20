"use client";

import { useMemo, useState } from "react";

export type ProfilePost = {
  id: string;
  imageUrl?: string | null;
  caption?: string | null;
  createdAt?: string | null;
};

export type Profile = {
  email: string;
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  bio?: string | null;
  followersCount?: number | null;
  followingCount?: number | null;
  isVerified?: boolean | null;
};

export default function ProfileClient({
  profile,
  posts,
}: {
  profile: Profile;
  posts: ProfilePost[];
}) {
  const [tab, setTab] = useState<"posts" | "media" | "about">("posts");

  const postsCount = posts?.length ?? 0;
  const followers = profile.followersCount ?? 0;
  const following = profile.followingCount ?? 0;

  const initial = (profile.displayName || profile.email || "U")[0]?.toUpperCase();

  const media = useMemo(() => {
    return (posts ?? []).filter((p) => (p.imageUrl ?? "").trim().length > 0);
  }, [posts]);

  return (
    <div className="space-y-5 pb-12">
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="p-5 flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center text-lg font-semibold">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold truncate">{profile.displayName}</div>
            <div className="text-sm text-white/60 truncate">{profile.handle}</div>
            <div className="text-xs text-white/40 truncate">{profile.email}</div>

            <div className="mt-3 flex items-center gap-2">
              <button className="px-4 py-2 rounded-xl bg-white text-black text-sm font-medium">
                Follow
              </button>
              <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-sm">
                Message
              </button>
              <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-sm">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold">{postsCount}</div>
              <div className="text-[11px] text-white/50">POSTS</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{followers}</div>
              <div className="text-[11px] text-white/50">FOLLOWERS</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{following}</div>
              <div className="text-[11px] text-white/50">FOLLOWING</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="grid grid-cols-3 border-b border-white/10">
          <TabButton active={tab === "posts"} onClick={() => setTab("posts")}>
            Posts
          </TabButton>
          <TabButton active={tab === "media"} onClick={() => setTab("media")}>
            Media
          </TabButton>
          <TabButton active={tab === "about"} onClick={() => setTab("about")}>
            About
          </TabButton>
        </div>

        {tab === "posts" ? (
          <div className="p-4">
            {!postsCount ? (
              <div className="text-sm text-white/60">No posts yet.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {posts.map((p) => (
                  <div
                    key={p.id}
                    className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10"
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === "media" ? (
          <div className="p-4">
            {!media.length ? (
              <div className="text-sm text-white/60">No media yet.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {media.map((p) => (
                  <div
                    key={p.id}
                    className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl!} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === "about" ? (
          <div className="p-4">
            <div className="text-sm text-white/80 whitespace-pre-wrap">
              {profile.bio?.trim() ? profile.bio : "No bio yet."}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "py-3 text-sm font-medium",
        active ? "bg-white/10 text-white" : "text-white/60 hover:text-white",
      ].join(" ")}
      type="button"
    >
      {children}
    </button>
  );
}
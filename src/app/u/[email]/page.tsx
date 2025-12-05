"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type Profile = {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

type PostStats = {
  id: string;
  tip_count: number | null;
  boost_count: number | null;
  spin_count: number | null;
};

export default function ProfilePage({
  params,
}: {
  params: { email: string };
}) {
  const router = useRouter();
  const email = decodeURIComponent(params.email);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostStats[]>([]);
  const [isMe, setIsMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayNameInput, setDisplayNameInput] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Who am I?
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsMe(user?.email === email);

        // Profile row
        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("email, display_name, avatar_url")
          .eq("email", email)
          .maybeSingle();

        if (profileError) throw profileError;

        const effectiveProfile: Profile = profileRow ?? {
          email,
          display_name: null,
          avatar_url: null,
        };

        setProfile(effectiveProfile);
        setDisplayNameInput(effectiveProfile.display_name ?? "");

        // Posts + support stats for this creator
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("id, tip_count, boost_count, spin_count")
          .eq("user_email", email);

        if (postsError) throw postsError;

        setPosts(postsData ?? []);
      } catch (e) {
        console.error("Error loading profile", e);
        setError("Revolvr glitched out loading this profile 😵‍💫");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [email]);

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      setError(null);

      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${profile.email}/${Date.now()}.${ext}`;

        const { data: storageData, error: storageError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, {
            upsert: true,
          });

        if (storageError || !storageData) {
          throw storageError ?? new Error("Avatar upload failed");
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(storageData.path);

        avatarUrl = publicUrl;
      }

      const cleanDisplayName =
        displayNameInput.trim().length > 0 ? displayNameInput.trim() : null;

      const { data: upserted, error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            email: profile.email,
            display_name: cleanDisplayName,
            avatar_url: avatarUrl,
          },
          { onConflict: "email" }
        )
        .select()
        .single();

      if (upsertError) throw upsertError;

      setProfile(upserted as Profile);
      setAvatarFile(null);
    } catch (e) {
      console.error("Error saving profile", e);
      setError("Revolvr glitched out saving your profile 😵‍💫");
    } finally {
      setSaving(false);
    }
  };

  const postCount = posts.length;
  const tipTotal = posts.reduce(
    (sum, p) => sum + (p.tip_count ?? 0),
    0
  );
  const boostTotal = posts.reduce(
    (sum, p) => sum + (p.boost_count ?? 0),
    0
  );
  const spinTotal = posts.reduce(
    (sum, p) => sum + (p.spin_count ?? 0),
    0
  );

  const displayName =
    profile?.display_name ||
    profile?.email?.split("@")[0]?.replace(/\W+/g, " ").trim() ||
    "Someone";

  const avatarInitial =
    displayName?.[0]?.toUpperCase() ||
    profile?.email?.[0]?.toUpperCase() ||
    "R";

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur">
        <button
          onClick={() => router.push("/public-feed")}
          className="text-xs sm:text-sm text-white/70 hover:text-white inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to feed</span>
        </button>
        <span className="text-xs sm:text-sm text-white/40">Profile</span>
      </header>

      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-3xl px-4 sm:px-6 py-6 space-y-6 pb-24">
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

          {loading || !profile ? (
            <div className="text-sm text-white/70">Loading profile…</div>
          ) : (
            <>
              {/* Header card */}
              <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-emerald-500/10 border border-white/10 overflow-hidden flex items-center justify-center text-2xl font-semibold">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{avatarInitial}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-xl sm:text-2xl font-semibold">
                      {displayName}
                    </h1>
                    <p className="text-xs sm:text-sm text-white/60">
                      {profile.email}
                    </p>
                  </div>
                </div>

                {isMe && (
                  <form
                    onSubmit={handleSaveProfile}
                    className="w-full sm:w-auto space-y-3 sm:space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        placeholder="Display name"
                        className="flex-1 rounded-full bg-white/5 border border-white/15 px-3 py-1.5 text-xs sm:text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      />
                      <label className="inline-flex items-center justify-center rounded-full border border-white/20 px-3 py-1.5 text-xs sm:text-sm cursor-pointer hover:bg-white/10">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            setAvatarFile(e.target.files?.[0] ?? null)
                          }
                        />
                        {avatarFile ? "Avatar selected" : "Change photo"}
                      </label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs sm:text-sm font-medium text-black shadow-md shadow-emerald-500/25 disabled:opacity-60"
                      >
                        {saving ? "Saving…" : "Save profile"}
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* Stats row */}
              <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex flex-col items-start">
                  <span className="text-lg sm:text-2xl font-semibold">
                    {postCount}
                  </span>
                  <span className="text-[11px] sm:text-xs text-white/60">
                    POSTS
                  </span>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex flex-col items-start">
                  <span className="text-lg sm:text-2xl font-semibold">
                    {tipTotal}
                  </span>
                  <span className="text-[11px] sm:text-xs text-white/60">
                    TIPS
                  </span>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex flex-col items-start">
                  <span className="text-lg sm:text-2xl font-semibold">
                    {boostTotal}
                  </span>
                  <span className="text-[11px] sm:text-xs text-white/60">
                    BOOSTS
                  </span>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex flex-col items-start">
                  <span className="text-lg sm:text-2xl font-semibold">
                    {spinTotal}
                  </span>
                  <span className="text-[11px] sm:text-xs text-white/60">
                    SPINS
                  </span>
                </div>
              </section>

              {/* Posts summary */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-white/80">
                    POSTS
                  </h2>
                </div>
                {postCount === 0 ? (
                  <p className="text-sm text-white/60">
                    No posts yet from this creator.
                  </p>
                ) : (
                  <p className="text-xs text-white/50">
                    Posts appear on the public feed. More detail coming soon.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

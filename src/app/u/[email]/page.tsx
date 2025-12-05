"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type Profile = {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type Stats = {
  posts: number;
  tips: number;
  boosts: number;
  spins: number;
};

type PageProps = {
  params: {
    email: string;
  };
};

export default function ProfilePage({ params }: PageProps) {
  const router = useRouter();
  const profileEmail = decodeURIComponent(params.email);

  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    posts: 0,
    tips: 0,
    boosts: 0,
    spins: 0,
  });

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile =
    authEmail &&
    authEmail.toLowerCase() === profileEmail.toLowerCase();

  // Load auth user + profile + stats
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Current auth user
        const { data: userData } = await supabase.auth.getUser();
        setAuthEmail(userData.user?.email ?? null);

        // Profile row (if any)
        const { data: profileRows, error: profileError } = await supabase
          .from("profiles")
          .select("email, display_name, avatar_url, bio")
          .eq("email", profileEmail)
          .limit(1);

        if (profileError) {
          console.error("Error loading profile", profileError);
        }

        const profileRow = (profileRows?.[0] ?? null) as Profile | null;
        setProfile(profileRow);

        setDisplayName(
          profileRow?.display_name ??
            profileEmail.split("@")[0]?.replace(/\W+/g, " ") ??
            ""
        );
        setBio(profileRow?.bio ?? "");

        // Basic stats from posts table
        const { data: postRows, error: postsError } = await supabase
          .from("posts")
          .select("id, tip_count, boost_count, spin_count")
          .eq("user_email", profileEmail);

        if (postsError) {
          console.error("Error loading stats", postsError);
        }

        let posts = 0;
        let tips = 0;
        let boosts = 0;
        let spins = 0;

        for (const row of postRows ?? []) {
          posts += 1;
          tips += row.tip_count ?? 0;
          boosts += row.boost_count ?? 0;
          spins += row.spin_count ?? 0;
        }

        setStats({ posts, tips, boosts, spins });
      } catch (e) {
        console.error("Unexpected error loading profile", e);
        setError("Revolvr glitched out loading this profile 😵‍💫");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profileEmail]);

  const safeDisplayName =
    displayName ||
    profile?.display_name ||
    profileEmail.split("@")[0]?.replace(/\W+/g, " ") ||
    "Someone";

  const avatarInitial = safeDisplayName[0]?.toUpperCase() ?? "R";

  // Avatar upload handler
  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !authEmail) return;

    try {
      setAvatarUploading(true);
      setError(null);

      const ext = file.name.split(".").pop() || "png";
      const safeId = authEmail.replace(/[^a-zA-Z0-9]/g, "_");
      const path = `${safeId}-${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError || !uploadData) {
        throw uploadError ?? new Error("Avatar upload failed");
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);

      // Upsert profile with new avatar
      const { data: upserted, error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            email: authEmail,
            display_name: safeDisplayName,
            bio: bio || null,
            avatar_url: publicUrl,
          },
          { onConflict: "email" }
        )
        .select()
        .single();

      if (upsertError) throw upsertError;

      setProfile(upserted as Profile);
    } catch (e) {
      console.error("Error uploading avatar", e);
      setError("Revolvr glitched out uploading your avatar 😵‍💫");
    } finally {
      setAvatarUploading(false);
      // reset file input so same file can be re-selected if needed
      event.target.value = "";
    }
  };

  // Save profile (name + bio, keep existing avatar_url if any)
  const handleProfileSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!authEmail) return;

    try {
      setSavingProfile(true);
      setError(null);

      const { data: upserted, error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            email: authEmail,
            display_name: displayName || safeDisplayName,
            bio: bio || null,
            avatar_url: profile?.avatar_url ?? null,
          },
          { onConflict: "email" }
        )
        .select()
        .single();

      if (upsertError) throw upsertError;

      setProfile(upserted as Profile);
    } catch (e) {
      console.error("Error saving profile", e);
      setError("Revolvr glitched out saving your profile 😵‍💫");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur">
        <button
          className="text-xs sm:text-sm text-white/60 hover:text-white flex items-center gap-1"
          onClick={() => router.push("/public-feed")}
        >
          <span className="text-lg">&larr;</span>
          <span>Back to feed</span>
        </button>
        <span className="text-sm sm:text-base text-white/70">Profile</span>
        <div className="w-8" />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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

        {/* Header block */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center overflow-hidden text-xl font-semibold text-emerald-200">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={safeDisplayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{avatarInitial}</span>
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-semibold">
                {safeDisplayName}
              </h1>
              <p className="text-xs sm:text-sm text-white/50">
                {profileEmail}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-center text-[11px] sm:text-xs">
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-base sm:text-lg font-semibold">
                {stats.posts}
              </div>
              <div className="uppercase tracking-wide text-white/50">Posts</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-base sm:text-lg font-semibold">
                {stats.tips}
              </div>
              <div className="uppercase tracking-wide text-white/50">Tips</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-base sm:text-lg font-semibold">
                {stats.boosts}
              </div>
              <div className="uppercase tracking-wide text-white/50">Boosts</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-base sm:text-lg font-semibold">
                {stats.spins}
              </div>
              <div className="uppercase tracking-wide text-white/50">Spins</div>
            </div>
          </div>
        </section>

        {/* Edit profile – only for own profile */}
        {isOwnProfile && (
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-4 shadow-md shadow-black/40">
            <h2 className="text-sm font-semibold tracking-wide text-white/80">
              Edit profile
            </h2>

            <form className="space-y-4" onSubmit={handleProfileSave}>
              {/* Avatar uploader */}
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center overflow-hidden text-xl font-semibold text-emerald-200">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={safeDisplayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{avatarInitial}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() =>
                      document
                        .getElementById("revolvrAvatarInput")
                        ?.click()
                    }
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-medium text-black shadow-md shadow-emerald-500/25 disabled:opacity-60"
                  >
                    {avatarUploading ? "Uploading…" : "Change photo"}
                  </button>
                  <span className="text-[11px] text-white/45">
                    JPG / PNG, square works best.
                  </span>
                </div>
              </div>

              <input
                id="revolvrAvatarInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />

              {/* Display name */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/70">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  placeholder="How should Revolvr show your name?"
                />
              </div>

              {/* Bio */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/70">
                  Bio (optional)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  placeholder="Say something about what you post…"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs sm:text-sm font-medium text-black shadow-md shadow-emerald-500/25 disabled:opacity-60"
                >
                  {savingProfile ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Posts list placeholder (you can wire this later) */}
        <section className="mt-4">
          <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-white/80 mb-2">
            POSTS
          </h2>
          {loading ? (
            <p className="text-sm text-white/60">Loading posts…</p>
          ) : stats.posts === 0 ? (
            <p className="text-sm text-white/60">
              No posts yet from this creator.
            </p>
          ) : (
            <p className="text-sm text-white/60">
              Posts will appear here (feed wiring can be added later).
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

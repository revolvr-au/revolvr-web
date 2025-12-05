"use client";

import {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type Profile = {
  id: string | null;
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
  params: { email: string };
};

export default function ProfilePage({ params }: PageProps) {
  const router = useRouter();

  // Route email (creator we are viewing)
  const routeEmailRaw = params.email;
  const routeEmail =
    typeof window === "undefined"
      ? routeEmailRaw
      : decodeURIComponent(routeEmailRaw);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    posts: 0,
    tips: 0,
    boosts: 0,
    spins: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  // Fallback display name from email if we don't have a profile row yet
  const fallbackDisplayName = (() => {
    if (!routeEmail) return "Someone";
    const [localPart] = routeEmail.split("@");
    const cleaned = (localPart ?? "")
      .replace(/\W+/g, " ")
      .trim();
    return cleaned || routeEmail;
  })();

  // Load auth user + determine if this is their own profile
  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setCurrentUserId(user.id);
          setCurrentUserEmail(user.email ?? null);

          if (user.email) {
            setIsOwnProfile(
              user.email.toLowerCase() === routeEmail.toLowerCase()
            );
          } else {
            setIsOwnProfile(false);
          }
        } else {
          setCurrentUserId(null);
          setCurrentUserEmail(null);
          setIsOwnProfile(false);
        }
      } catch (e) {
        console.error("Error loading auth user for profile", e);
      }
    };

    loadUser();
  }, [routeEmail]);

  // Load profile + (later) stats
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Profile by email (viewable by anyone)
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url, bio")
          .eq("email", routeEmail.toLowerCase())
          .maybeSingle();

        if (error) {
          console.error("Error loading profile", error);
        }

        if (data) {
          const p: Profile = {
            id: data.id,
            email: data.email ?? routeEmail,
            display_name: data.display_name,
            avatar_url: data.avatar_url,
            bio: data.bio,
          };
          setProfile(p);
          setAvatarPreviewUrl(p.avatar_url);
        } else {
          // No profile row yet – create a local placeholder so UI isn't "undefined"
          const placeholder: Profile = {
            id: null,
            email: routeEmail,
            display_name: null,
            avatar_url: null,
            bio: null,
          };
          setProfile(placeholder);
          setAvatarPreviewUrl(null);
        }

        // TODO (step 2): load real stats from posts + tips/boosts/spins
        setStats({
          posts: 0,
          tips: 0,
          boosts: 0,
          spins: 0,
        });
      } catch (e) {
        console.error("Error loading profile page", e);
        setError("Revolvr glitched out loading this profile 😵‍💫");
      } finally {
        setLoading(false);
      }
    };

    if (routeEmail) {
      loadProfile();
    }
  }, [routeEmail]);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const startEditing = () => {
    if (!profile || !isOwnProfile) return;
    setEditing(true);
    setDisplayNameInput(profile.display_name ?? fallbackDisplayName);
    setBioInput(profile.bio ?? "");
    // avatarPreviewUrl already set
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!isOwnProfile || !currentUserId || !routeEmail) return;

    try {
      setSaving(true);
      setError(null);

      let avatarUrl = profile?.avatar_url ?? null;

      // Upload new avatar if selected
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "png";
        const filePath = `${currentUserId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile);

        if (uploadError || !uploadData) {
          console.error("Avatar upload error", uploadError);
          throw new Error("Avatar upload failed");
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);

        avatarUrl = publicUrl;
      }

      const trimmedName = displayNameInput.trim();
      const safeDisplayName = trimmedName || fallbackDisplayName;

      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: currentUserId,
            email: routeEmail.toLowerCase(),
            display_name: safeDisplayName,
            avatar_url: avatarUrl,
            bio: bioInput.trim() || null,
          },
          { onConflict: "id" }
        )
        .select("id, email, display_name, avatar_url, bio")
        .single();

      if (error) {
        console.error("Error saving profile", error);
        setError("Revolvr glitched out saving your profile 😵‍��");
        return;
      }

      const saved: Profile = {
        id: data.id,
        email: data.email ?? routeEmail,
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        bio: data.bio,
      };

      setProfile(saved);
      setAvatarPreviewUrl(saved.avatar_url);
      setEditing(false);
    } catch (err) {
      console.error("Unexpected error saving profile", err);
      setError("Revolvr glitched out saving your profile 😵‍💫");
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    profile?.display_name?.trim() || fallbackDisplayName || "Someone";

  const avatarInitial = displayName[0]?.toUpperCase() ?? "U";

  // Simple posts message for now – will wire real posts later
  const postsMessage =
    stats.posts > 0
      ? "Posts will show here soon."
      : "No posts yet from this creator.";

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col pb-16">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050814]/90 backdrop-blur flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => router.push("/public-feed")}
          className="text-xs sm:text-sm text-white/60 hover:text-white flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to feed</span>
        </button>
        <span className="text-xs sm:text-sm text-white/50">Profile</span>
      </header>

      {/* Main */}
      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-3xl px-4 sm:px-6 py-6 space-y-6">
          {/* Error */}
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

          {/* Header */}
          <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-emerald-700/30 flex items-center justify-center text-2xl font-semibold text-emerald-100 overflow-hidden">
                {avatarPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreviewUrl}
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
                <span className="text-xs sm:text-sm text-white/50">
                  {routeEmail || "unknown"}
                </span>
                {profile?.bio && (
                  <p className="mt-1 text-xs sm:text-sm text-white/70 max-w-xl">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {isOwnProfile && (
              <div className="flex gap-2">
                {!editing ? (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="px-3 py-1.5 rounded-full border border-white/20 text-xs sm:text-sm hover:bg-white/10"
                  >
                    Edit profile
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-3 py-1.5 rounded-full border border-white/20 text-xs sm:text-sm hover:bg-white/10"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Stats row */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="POSTS" value={stats.posts} />
            <StatCard label="TIPS" value={stats.tips} />
            <StatCard label="BOOSTS" value={stats.boosts} />
            <StatCard label="SPINS" value={stats.spins} />
          </section>

          {/* Edit profile form (only for own profile) */}
          {isOwnProfile && editing && (
            <section className="rounded-2xl bg-[#070b1b] border border-white/10 p-4 space-y-4 shadow-md shadow-black/30">
              <h2 className="text-sm sm:text-base font-semibold">
                Edit your profile
              </h2>
              <form className="space-y-4" onSubmit={handleSaveProfile}>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                  <div>
                    <p className="text-xs text-white/60 mb-2">Avatar</p>
                    <div className="h-16 w-16 rounded-2xl bg-emerald-700/30 flex items-center justify-center text-2xl font-semibold text-emerald-100 overflow-hidden">
                      {avatarPreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarPreviewUrl}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{avatarInitial}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-white/70 block mb-1">
                      Upload new avatar
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="block w-full text-xs text-white/70 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-white/10 file:text-white hover:file:bg-white/20"
                    />
                    <p className="mt-1 text-[11px] text-white/40">
                      Square images work best. You can change this later.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-white/70 block mb-1">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    placeholder={fallbackDisplayName}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-white/70 block mb-1">
                    Bio (optional)
                  </label>
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    placeholder="Tell people what you post, in a sentence or two."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full border border-white/20 text-xs sm:text-sm hover:bg-white/10"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs sm:text-sm font-medium text-black shadow-md shadow-emerald-500/25 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save profile"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Posts section */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-white/80">
              POSTS
            </h2>
            <p className="text-sm text-white/60 py-6">{postsMessage}</p>
          </section>
        </div>
      </main>

      {/* Bottom app nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#050814]/95 backdrop-blur">
        <div className="mx-auto max-w-xl px-6 py-2 flex items-center justify-between text-xs sm:text-sm">
          {/* Feed */}
          <button
            type="button"
            onClick={() => router.push("/public-feed")}
            className="flex flex-col items-center flex-1 text-white/70 hover:text-white"
          >
            <span className="text-lg">🏠</span>
            <span className="mt-0.5">Feed</span>
          </button>

          {/* Post */}
          <Link
            href="/public-feed#revolvrComposer"
            className="flex flex-col items-center flex-1 text-emerald-300 hover:text-emerald-100"
          >
            <span className="text-lg">➕</span>
            <span className="mt-0.5">Post</span>
          </Link>

          {/* Profile (active) */}
          <button
            type="button"
            onClick={() => {
              if (!currentUserEmail) {
                const redirect = encodeURIComponent("/public-feed");
                router.push(`/login?redirectTo=${redirect}`);
                return;
              }
              router.push(`/u/${encodeURIComponent(currentUserEmail)}`);
            }}
            className="flex flex-col items-center flex-1 text-emerald-300 hover:text-emerald-100"
          >
            <span className="text-lg">👤</span>
            <span className="mt-0.5">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-[#070b1b] border border-white/10 px-4 py-3 flex flex-col items-center justify-center">
      <div className="text-xl font-semibold">{value}</div>
      <div className="mt-1 text-[11px] text-white/60 tracking-wide">
        {label}
      </div>
    </div>
  );
}

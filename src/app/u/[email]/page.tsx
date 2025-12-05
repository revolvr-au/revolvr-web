"use client";

import {
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
} from "react";
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
  const profileEmailParam = decodeURIComponent(params.email);

  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasProfileRow, setHasProfileRow] = useState(false);

  const [stats, setStats] = useState<Stats>({
    posts: 0,
    tips: 0,
    boosts: 0,
    spins: 0,
  });

  const [displayNameInput, setDisplayNameInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If logged in, always use the auth email as the “effective” profile owner.
  const effectiveEmail = authEmail ?? profileEmailParam;
  // TEMP: always show edit form; RLS still protects actual data
const isOwnProfile = true;


  // Load current auth user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setAuthEmail(user?.email ?? null);
      } catch (e) {
        console.error("Error loading auth user in profile page", e);
      }
    };

    loadUser();
  }, []);

  // Load profile + stats for the effective email
  useEffect(() => {
    if (!effectiveEmail) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Profile row
        const { data: profileRow, error: profileError } =
          await supabase
            .from("profiles")
            .select("email, display_name, avatar_url, bio")
            .eq("email", effectiveEmail)
            .maybeSingle();

        if (profileError) throw profileError;

        if (profileRow) {
          const hydrated: Profile = {
            email: profileRow.email,
            display_name: profileRow.display_name,
            avatar_url: profileRow.avatar_url,
            bio: profileRow.bio,
          };
          setProfile(hydrated);
          setDisplayNameInput(hydrated.display_name ?? "");
          setBioInput(hydrated.bio ?? "");
          setAvatarPreview(hydrated.avatar_url ?? null);
          setHasProfileRow(true);
        } else {
          // No profile row yet – fall back to email-derived name
          setProfile({
            email: effectiveEmail,
            display_name: null,
            avatar_url: null,
            bio: null,
          });
          setDisplayNameInput("");
          setBioInput("");
          setAvatarPreview(null);
          setHasProfileRow(false);
        }

        // Stats from posts
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("user_email, tip_count, boost_count, spin_count")
          .eq("user_email", effectiveEmail);

        if (postsError) throw postsError;

        const posts = postsData ?? [];
        const postsCount = posts.length;
        const tipsCount = posts.reduce(
          (sum, p: any) => sum + (p.tip_count ?? 0),
          0
        );
        const boostsCount = posts.reduce(
          (sum, p: any) => sum + (p.boost_count ?? 0),
          0
        );
        const spinsCount = posts.reduce(
          (sum, p: any) => sum + (p.spin_count ?? 0),
          0
        );

        setStats({
          posts: postsCount,
          tips: tipsCount,
          boosts: boostsCount,
          spins: spinsCount,
        });
      } catch (e) {
        console.error("Error loading profile page data", e);
        setError("Revolvr glitched out loading this profile 😵‍💫");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [effectiveEmail]);

  const effectiveDisplayName =
    profile?.display_name ||
    effectiveEmail.split("@")[0]?.replace(/\W+/g, " ") ||
    "Someone";

  const avatarInitial =
    effectiveDisplayName.trim()[0]?.toUpperCase() ??
    effectiveEmail[0]?.toUpperCase() ??
    "R";

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!authEmail) {
      setError("You need to be signed in to edit your profile.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      let avatarUrlToSave: string | null = profile?.avatar_url ?? null;

      // If a new file is chosen, upload to Supabase storage (avatars bucket)
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const filePath = `${authEmail}/${Date.now()}.${ext}`;

        const { data: uploadData, error: uploadError } =
          await supabase.storage
            .from("avatars")
            .upload(filePath, avatarFile, { upsert: true });

        if (uploadError || !uploadData) {
          console.error("Avatar upload error", uploadError);
          setError(
            "Revolvr glitched out uploading your avatar. Try again."
          );
          setIsSaving(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("avatars")
          .getPublicUrl(uploadData.path);

        avatarUrlToSave = publicUrl;
      }

      const displayNameClean =
        displayNameInput.trim() === ""
          ? null
          : displayNameInput.trim();
      const bioClean =
        bioInput.trim() === "" ? null : bioInput.trim();

      let savedProfile: Profile | null = null;

      if (!hasProfileRow) {
        // INSERT (first time creating profile)
        const { data, error } = await supabase
          .from("profiles")
          .insert({
            email: authEmail,
            display_name: displayNameClean,
            bio: bioClean,
            avatar_url: avatarUrlToSave,
          })
          .select()
          .single();

        if (error) {
          console.error("Profile insert error", error);
          setError(
            "Revolvr glitched out saving your profile. Try again."
          );
          setIsSaving(false);
          return;
        }

        savedProfile = {
          email: authEmail,
          display_name: data.display_name,
          bio: data.bio,
          avatar_url: data.avatar_url,
        };
        setHasProfileRow(true);
      } else {
        // UPDATE existing profile
        const { data, error } = await supabase
          .from("profiles")
          .update({
            display_name: displayNameClean,
            bio: bioClean,
            avatar_url: avatarUrlToSave,
          })
          .eq("email", authEmail)
          .select()
          .single();

        if (error) {
          console.error("Profile update error", error);
          setError(
            "Revolvr glitched out saving your profile. Try again."
          );
          setIsSaving(false);
          return;
        }

        savedProfile = {
          email: authEmail,
          display_name: data.display_name,
          bio: data.bio,
          avatar_url: data.avatar_url,
        };
      }

      if (savedProfile) {
        setProfile(savedProfile);
        if (savedProfile.avatar_url) {
          setAvatarPreview(savedProfile.avatar_url);
        }
      }
    } catch (e) {
      console.error("Unhandled profile save error", e);
      setError("Revolvr glitched out saving your profile 😵‍💫");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#050814]/95 backdrop-blur">
        <button
          type="button"
          onClick={() => router.push("/public-feed")}
          className="text-xs sm:text-sm text-white/70 hover:text-white inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to feed</span>
        </button>
        <span className="text-sm sm:text-base font-medium">
          Profile
        </span>
        <div className="w-10" />
      </header>

      {/* Main content */}
      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-4xl px-4 sm:px-6 py-6 space-y-6">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/40 px-3 py-2 text-xs sm:text-sm text-red-100 flex justify-between items-center">
              <span>{error}</span>
              <button
                className="underline text-[11px]"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Top section: avatar + name + stats */}
          <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg font-semibold text-emerald-300 uppercase overflow-hidden">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={effectiveDisplayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{avatarInitial}</span>
                )}
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-semibold">
                  {effectiveDisplayName || "Someone"}
                </h1>
                <span className="text-xs sm:text-sm text-white/50">
                  {profile?.display_name ? effectiveEmail : "undefined"}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                <div className="text-base font-semibold">
                  {stats.posts}
                </div>
                <div className="text-[11px] text-white/60">POSTS</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                <div className="text-base font-semibold">
                  {stats.tips}
                </div>
                <div className="text-[11px] text-white/60">TIPS</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                <div className="text-base font-semibold">
                  {stats.boosts}
                </div>
                <div className="text-[11px] text-white/60">
                  BOOSTS
                </div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                <div className="text-base font-semibold">
                  {stats.spins}
                </div>
                <div className="text-[11px] text-white/60">SPINS</div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)] gap-6 items-start">
            {/* Left: posts list (for now just empty state) */}
            <section className="space-y-3">
              <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-white/80">
                POSTS
              </h2>
              {isLoading ? (
                <p className="text-sm text-white/60">
                  Loading this creator&apos;s posts…
                </p>
              ) : stats.posts === 0 ? (
                <p className="text-sm text-white/60">
                  No posts yet from this creator.
                </p>
              ) : (
                <p className="text-sm text-white/60">
                  Posts will show here (feed wiring later).
                </p>
              )}
            </section>

            {/* Right: edit profile (only if signed in) */}
            {isOwnProfile && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
                <h2 className="text-sm font-semibold">
                  Edit profile
                </h2>
                <p className="text-[11px] text-white/60">
                  This is your public identity across Revolvr.
                </p>

                <form
                  onSubmit={handleProfileSubmit}
                  className="space-y-4"
                >
                  {/* Avatar upload */}
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-semibold text-emerald-300 overflow-hidden">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{avatarInitial}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-white/80">
                        Profile image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="text-[11px] text-white/70"
                      />
                      <span className="text-[10px] text-white/40">
                        JPG / PNG, square images look best.
                      </span>
                    </div>
                  </div>

                  {/* Display name */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/80">
                      Display name
                    </label>
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) =>
                        setDisplayNameInput(e.target.value)
                      }
                      placeholder="What should people call you?"
                      className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    />
                    <p className="text-[10px] text-white/40">
                      If left blank, Revolvr uses the bit before your
                      email.
                    </p>
                  </div>

                  {/* Bio */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/80">
                      Bio
                    </label>
                    <textarea
                      value={bioInput}
                      onChange={(e) =>
                        setBioInput(e.target.value)
                      }
                      rows={3}
                      placeholder="One or two lines about what you spin into existence…"
                      className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-full border border-white/20 text-xs sm:text-sm hover:bg-white/10 transition"
                      onClick={() => {
                        // reset form to last saved profile
                        setDisplayNameInput(
                          profile?.display_name ?? ""
                        );
                        setBioInput(profile?.bio ?? "");
                        setAvatarFile(null);
                        setAvatarPreview(profile?.avatar_url ?? null);
                      }}
                      disabled={isSaving}
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs sm:text-sm font-medium text-black shadow-md shadow-emerald-500/25 disabled:opacity-60"
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving…" : "Save profile"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {!isOwnProfile && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-sm text-white/70">
                <p>
                  You&apos;re viewing{" "}
                  <span className="font-semibold">
                    {effectiveDisplayName}
                  </span>
                  &apos;s public profile.
                </p>
                <p className="text-[11px] text-white/40">
                  When creators sign in, they&apos;ll be able to edit
                  their name, image and bio here.
                </p>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

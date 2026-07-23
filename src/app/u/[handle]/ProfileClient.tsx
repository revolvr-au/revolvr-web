"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import HamburgerMenu from "@/components/HamburgerMenu";
import ProfileHeader from "@/components/ProfileHeader";
import { getRingColor } from "@/components/RingRim";
import { hasRing } from "@/lib/ringGates";

export type ProfilePost = {
  id: string;
  image_Url?: string | null;
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
  isVerified?: boolean | null;
  totalVoltage: number;
  recentVoltage: number;
  postCount: number;
  ringTier?: string | null;
};

export default function ProfileClient({
  profile,
  posts,
  isFollowing = false,
  isCreator = false,
  savedCount = 0,
}: {
  profile: Profile;
  posts: ProfilePost[];
  isFollowing?: boolean;
  isCreator?: boolean;
  savedCount?: number;
}) {
  const [followed, setFollowed] = useState(isFollowing);
  const [followPending, setFollowPending] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gridPosts, setGridPosts] = useState<ProfilePost[]>(posts);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const ringColor = getRingColor(profile.ringTier);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const email = user?.email ?? null;
      setCurrentUserEmail(email);
      if (email && profile.email) {
        setIsOwnProfile(
          email.trim().toLowerCase() === profile.email.trim().toLowerCase()
        );
      }
    });
  }, [profile.email]);

  const handleFollowClick = async () => {
    if (followPending) return;
    if (!currentUserEmail || isOwnProfile) return;

    const nextFollowed = !followed;
    const action = nextFollowed ? "follow" : "unfollow";

    setFollowed(nextFollowed);
    setFollowPending(true);

    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewerEmail: currentUserEmail,
          targetHandle: profile.handle,
          action,
        }),
      });
      if (!res.ok) throw new Error(`follow_failed_${res.status}`);
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!data?.ok) throw new Error("follow_not_ok");
    } catch (err) {
      console.error("Follow toggle failed:", err);
      setFollowed(!nextFollowed);
    } finally {
      setFollowPending(false);
    }
  };

  // Owner post delete. Optimistically remove the tile; on failure re-insert it
  // at its original position and surface the error. DELETE endpoint enforces
  // ownership server-side — this UI is only shown on the owner's own profile.
  const handleDeletePost = async (postId: string) => {
    setOpenMenuId(null);
    if (typeof window !== "undefined" &&
        !window.confirm("Delete this post? This can't be undone.")) {
      return;
    }

    let removed: ProfilePost | null = null;
    let removedIndex = -1;
    setGridPosts((prev) => {
      const idx = prev.findIndex((p) => String(p.id) === String(postId));
      if (idx === -1) return prev;
      removed = prev[idx];
      removedIndex = idx;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`delete_failed_${res.status}`);
    } catch (err) {
      console.error("Post delete failed:", err);
      if (removed) {
        setGridPosts((prev) => {
          if (prev.some((p) => String(p.id) === String(postId))) return prev; // already restored
          const at = removedIndex < 0 ? prev.length : Math.min(removedIndex, prev.length);
          return [...prev.slice(0, at), removed as ProfilePost, ...prev.slice(at)];
        });
      }
      if (typeof window !== "undefined") {
        window.alert("Couldn't delete that post. Please try again.");
      }
    }
  };

  const postsCount = gridPosts?.length ?? 0;
  const initial = (profile.displayName || profile.email || "U")[0]?.toUpperCase();

  const offerings = isCreator
    ? ["🎵 Music", "🎛️ Production", "🎤 Features", "🎬 Videos", "📻 Podcasts", "🎧 Sessions"]
    : ["🎵 Music", "🏋️ Fitness", "🎮 Gaming", "📸 Photography", "✈️ Travel", "🍔 Food"];

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${profile.handle}/avatar.${ext}`;

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (error) {
      console.error("Avatar upload failed:", error);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = data.publicUrl;

    setAvatarUrl(newUrl);

    await fetch("/api/profile/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: newUrl }),
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0806",
      color: "white",
      fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: 480,
      margin: "0 auto",
    }}>
      <style>{`
        @keyframes arcSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── TOP NAV ── */}
      <div style={{
        padding: "20px 20px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <a href="/public-feed" style={{
          fontSize: 22,
          color: "white",
          textDecoration: "none",
          lineHeight: 1,
          padding: "4px 2px",
        }}>←</a>
        <div style={{
          fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
          fontSize: 16,
          letterSpacing: 6,
          color: "white",
        }}>REVOLVR</div>
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            fontSize: 22,
            cursor: "pointer",
            lineHeight: 1,
            padding: "4px 2px",
          }}
        >≡</button>
      </div>

      <HamburgerMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        isCreator={isCreator}
        isOwnProfile={isOwnProfile}
        handle={profile.handle}
      />

      {/* ── HERO ── */}
      <div style={{
        padding: "32px 20px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}>

        {/* CREATOR badge */}
        {isCreator && (
          <div style={{
            fontFamily: "monospace",
            fontSize: 9,
            letterSpacing: 3,
            color: "#ffffff",
            textTransform: "uppercase",
          }}>CREATOR</div>
        )}

        {/* Arc Avatar 140px */}
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <div style={followed ? {
            position: "absolute",
            inset: -5,
            borderRadius: "50%",
            border: "2.5px solid #ffffff",
            filter: "drop-shadow(0 0 6px #ffffff)",
            boxShadow: "0 0 12px rgba(255,255,255,0.4)",
          } : {
            position: "absolute",
            inset: -5,
            borderRadius: "50%",
            border: "2.5px solid transparent",
            borderTopColor: "#ffffff",
            borderRightColor: "#ffffff",
            filter: "drop-shadow(0 0 6px #ffffff)",
            animation: "arcSpin 1.8s linear infinite",
          }} />

          {isOwnProfile && (
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: "none" }}
            />
          )}

          {isOwnProfile ? (
            <label htmlFor="avatar-upload" style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 112, height: 112,
              borderRadius: "50%",
              cursor: "pointer",
              display: "block",
              boxShadow: ringColor ? `0 0 0 3px ${ringColor}, 0 0 14px ${ringColor}50` : undefined,
            }}>
              <div style={{
                width: "100%", height: "100%",
                borderRadius: "50%",
                background: avatarUrl
                  ? `url(${avatarUrl}) center/cover`
                  : "linear-gradient(135deg, #1a1a2e, #16213e)",
                border: ringColor ? "none" : "1.5px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 42, fontWeight: 700,
                position: "relative",
                overflow: "hidden",
              }}>
                {!avatarUrl && initial}
                <span style={{
                  position: "absolute",
                  bottom: 6, right: 6,
                  fontSize: 16,
                  background: "rgba(0,0,0,0.55)",
                  borderRadius: "50%",
                  padding: "3px 4px",
                  lineHeight: 1,
                }}>📷</span>
              </div>
            </label>
          ) : (
            <div style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 112, height: 112,
              borderRadius: "50%",
              background: avatarUrl
                ? `url(${avatarUrl}) center/cover`
                : "linear-gradient(135deg, #1a1a2e, #16213e)",
              border: ringColor ? "none" : "1.5px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 42, fontWeight: 700,
              boxShadow: ringColor ? `0 0 0 3px ${ringColor}, 0 0 14px ${ringColor}50` : undefined,
            }}>
              {!avatarUrl && initial}
            </div>
          )}
        </div>

        <div style={{ width: "100%", maxWidth: 320 }}>
          <ProfileHeader
            name={profile.displayName}
            totalVoltage={profile.totalVoltage}
            recentVoltage={profile.recentVoltage}
            postCount={profile.postCount}
            savedCount={savedCount}
          />

          <div style={{ textAlign: "center", marginTop: 4 }}>
            <div style={{
              fontSize: 11, color: "#ffffff",
              fontFamily: "monospace", letterSpacing: 1,
            }}>
              @{profile.handle}
            </div>
          </div>
        </div>

        {/* Voice bio — Blue Ring required */}
        {hasRing(profile.ringTier, "BLUE") ? (
          <div style={{
            width: "100%",
            maxWidth: 300,
            background: "transparent",
            border: "1px solid #1a1510",
            borderRadius: 24,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>🎙️</span>
            <span style={{ fontSize: 11, color: "#ffffff", fontFamily: "monospace", letterSpacing: 2 }}>Intro</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>▶</span>
            <div style={{ flex: 1, height: 1, background: "#1a1510" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>0:30</span>
          </div>
        ) : isOwnProfile ? (
          <a href="/rings" style={{
            width: "100%",
            maxWidth: 300,
            background: "transparent",
            border: "1px dashed rgba(59,130,246,0.3)",
            borderRadius: 24,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={{ fontSize: 11, color: "rgba(59,130,246,0.7)", fontFamily: "monospace", letterSpacing: 1 }}>
              Voice intro · Blue Ring
            </span>
          </a>
        ) : null}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 320, marginTop: 20 }}>
          <button
            onClick={handleFollowClick}
            disabled={followPending || isOwnProfile || !currentUserEmail}
            style={{
              flex: 1, padding: "11px 0",
              borderRadius: 50,
              background: followed
                ? "rgba(22,28,40,0.95)"
                : "#ffffff",
              border: followed
                ? "1px solid rgba(255,255,255,0.45)"
                : "1px solid #ffffff",
              color: followed ? "#ffffff" : "#0a0e16",
              fontSize: 12, fontWeight: 800,
              cursor: (followPending || isOwnProfile || !currentUserEmail) ? "not-allowed" : "pointer",
              opacity: followPending ? 0.6 : 1,
              transition: "all 0.25s ease",
              letterSpacing: "0.22em",
              fontFamily: "monospace",
              boxShadow: followed ? "none" : "0 4px 20px rgba(255,255,255,0.28)",
            }}
          >
            {followed ? "LINKED" : "LINK"}
          </button>
          <button style={{
            flex: 1, padding: "11px 0",
            borderRadius: 50,
            background: "transparent",
            border: "1px solid #1a1a1a",
            color: "rgba(255,255,255,0.6)",
            fontSize: 13, fontWeight: 600,
            cursor: "pointer",
            letterSpacing: 0.5,
            fontFamily: "monospace",
          }}>
            {isCreator ? "⚡ Gift" : "Message"}
          </button>
        </div>

        {/* Offerings shelf — single horizontal scroll row */}
        <div style={{
          display: "flex",
          flexDirection: "row",
          overflowX: "auto",
          gap: 8,
          padding: "4px 20px",
          scrollbarWidth: "none",
          width: "100%",
        }}>
          {offerings.map((item, i) => (
            <div key={i} style={{
              flexShrink: 0,
              background: "#f5f0e8",
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 11,
              fontFamily: "monospace",
              color: "#0a0806",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              {item}
            </div>
          ))}
        </div>

        {/* Bio */}
        {profile.bio?.trim() && (
          <div style={{
            fontSize: 14, color: "rgba(255,255,255,0.6)",
            textAlign: "center",
            lineHeight: 1.7,
            marginTop: 16,
            padding: "0 24px",
          }}>
            {profile.bio}
          </div>
        )}
      </div>

      {/* Separator above grid (creator only) */}
      {isCreator && (
        <div style={{ borderTop: "1px solid #1a1510" }} />
      )}

      {/* ── POST GRID ── */}
      {!postsCount ? (
        <div style={{
          textAlign: "center", padding: "48px 0",
          fontSize: 11, color: "#252525",
          fontFamily: "monospace", letterSpacing: 1.5,
        }}>
          NO POSTS YET
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 2,
        }}>
          {gridPosts.map((p) => {
            const url = p.imageUrl ?? p.image_Url ?? "";
            return (
              <div key={p.id} style={{
                aspectRatio: "1",
                background: "#0e0b08",
                position: "relative",
                overflow: "hidden",
              }}>
                {url ? (
                  <img src={url} alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "#1a1a1a", fontFamily: "monospace",
                  }}>—</div>
                )}
                {/* Owner-only tile menu. Structured as a dropdown list so more
                    items (edit, share, …) can be appended later; ships Delete only. */}
                {isOwnProfile && (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenMenuId((cur) => (cur === p.id ? null : p.id))}
                      aria-label="Post options"
                      style={{
                        position: "absolute",
                        top: 4, right: 4,
                        zIndex: 2,
                        width: 26, height: 26,
                        borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.55)",
                        border: "none",
                        color: "rgba(255,255,255,0.9)",
                        fontSize: 15, lineHeight: 1,
                        cursor: "pointer",
                      }}
                    >⋮</button>
                    {openMenuId === p.id && (
                      <div
                        role="menu"
                        style={{
                          position: "absolute",
                          top: 32, right: 4,
                          zIndex: 3,
                          minWidth: 120,
                          background: "#141019",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 10,
                          overflow: "hidden",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                        }}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleDeletePost(p.id)}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 14px",
                            background: "transparent",
                            border: "none",
                            color: "#ff6b6b",
                            fontSize: 13,
                            fontFamily: "monospace",
                            letterSpacing: 0.5,
                            cursor: "pointer",
                          }}
                        >Delete</button>
                      </div>
                    )}
                  </>
                )}
                <div style={{
                  position: "absolute",
                  bottom: 4, left: 5,
                  fontSize: 9,
                  color: "rgba(255,255,255,0.65)",
                  fontFamily: "monospace",
                  display: "flex", alignItems: "center", gap: 2,
                  textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                }}>▶ 0</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

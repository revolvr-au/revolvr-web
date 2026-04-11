"use client";

import { useMemo, useState } from "react";

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
  const [followed, setFollowed] = useState(false);

  const postsCount = posts?.length ?? 0;
  const followers = profile.followersCount ?? 0;
  const following = profile.followingCount ?? 0;
  const initial = (profile.displayName || profile.email || "U")[0]?.toUpperCase();
  const circumference = 2 * Math.PI * 28;

  const media = useMemo(() => {
    return (posts ?? []).filter((p) => {
      const url = p.imageUrl ?? p.image_Url ?? "";
      return url.trim().length > 0;
    });
  }, [posts]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060606",
      color: "white",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        padding: "20px 20px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 22,
          letterSpacing: 6,
          color: "white",
        }}>REVOLVR</span>
        <span style={{ fontSize: 11, color: "#333", letterSpacing: 2, fontFamily: "monospace" }}>
          PROFILE
        </span>
      </div>

      {/* ── HERO SECTION ── */}
      <div style={{
        padding: "32px 20px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        borderBottom: "1px solid #111",
      }}>

        {/* Arc Avatar */}
        <div style={{ position: "relative", width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80"
            style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <circle cx="40" cy="40" r="28" fill="none"
              stroke="#00e5ff" strokeWidth="1.5" opacity="0.07"/>
            {followed ? (
              <circle cx="40" cy="40" r="28" fill="none"
                stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset="0"
                style={{
                  transformOrigin: "40px 40px",
                  transform: "rotate(-90deg)",
                  filter: "drop-shadow(0 0 8px #00e5ff)",
                  transition: "stroke-dashoffset 0.55s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            ) : (
              <circle cx="40" cy="40" r="28" fill="none"
                stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray="95 82"
                className="arc-spin"
                style={{ filter: "drop-shadow(0 0 5px #00e5ff)" }}
              />
            )}
          </svg>

          {/* Avatar */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 60, height: 60,
            borderRadius: "50%",
            background: profile.avatarUrl
              ? `url(${profile.avatarUrl}) center/cover`
              : "linear-gradient(135deg, #1a1a2e, #16213e)",
            border: "1.5px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700,
            boxShadow: followed ? "0 0 0 2px rgba(0,229,255,0.2)" : "none",
            transition: "box-shadow 0.4s ease",
          }}>
            {!profile.avatarUrl && initial}
          </div>

          {/* Verified badge */}
          {profile.isVerified && (
            <div style={{
              position: "absolute", bottom: 2, right: 2,
              width: 18, height: 18, borderRadius: "50%",
              background: "#FFD700",
              border: "2px solid #060606",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9,
            }}>⬡</div>
          )}
        </div>

        {/* Name + handle */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.5 }}>
            {profile.displayName}
          </div>
          <div style={{
            fontSize: 12, color: "#444",
            fontFamily: "monospace", letterSpacing: 1, marginTop: 4,
          }}>
            @{profile.handle}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: "flex", gap: 0,
          background: "#0d0d0d",
          border: "1px solid #141414",
          borderRadius: 14, overflow: "hidden",
          width: "100%", maxWidth: 300,
        }}>
          {[
            { val: postsCount, label: "POSTS" },
            { val: followers, label: "FOLLOWERS" },
            { val: following, label: "FOLLOWING" },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: "12px 8px",
              textAlign: "center",
              borderRight: i < 2 ? "1px solid #141414" : "none",
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 20, letterSpacing: 1, color: "#fff",
              }}>{s.val}</div>
              <div style={{
                fontSize: 9, color: "#333",
                fontFamily: "monospace", letterSpacing: 1.5,
                marginTop: 2,
              }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 300 }}>
          <button
            onClick={() => setFollowed(prev => !prev)}
            style={{
              flex: 1, padding: "10px 0",
              borderRadius: 12,
              background: followed
                ? "rgba(0,229,255,0.08)"
                : "rgba(255,255,255,0.95)",
              border: followed
                ? "1px solid rgba(0,229,255,0.3)"
                : "none",
              color: followed ? "#00e5ff" : "#000",
              fontSize: 13, fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.25s ease",
              letterSpacing: 0.5,
            }}
          >
            {followed ? "Following" : "Follow"}
          </button>
          <button style={{
            flex: 1, padding: "10px 0",
            borderRadius: 12,
            background: "transparent",
            border: "1px solid #1a1a1a",
            color: "#555",
            fontSize: 13, fontWeight: 600,
            cursor: "pointer",
            letterSpacing: 0.5,
          }}>
            Message
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid #0e0e0e",
      }}>
        {(["posts", "media", "about"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "14px 0",
              background: "transparent",
              border: "none",
              borderBottom: tab === t
                ? "2px solid #00e5ff"
                : "2px solid transparent",
              color: tab === t ? "#00e5ff" : "#333",
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: 2,
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ padding: "16px" }}>

        {tab === "posts" && (
          <>
            {!postsCount ? (
              <div style={{
                textAlign: "center", padding: "40px 0",
                fontSize: 12, color: "#252525",
                fontFamily: "monospace", letterSpacing: 1,
              }}>
                No posts yet.
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 3,
              }}>
                {posts.map((p) => {
                  const url = p.imageUrl ?? p.image_Url ?? "";
                  return (
                    <div key={p.id} style={{
                      aspectRatio: "1",
                      background: "#0d0d0d",
                      borderRadius: 8,
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
                        }}>
                          NO IMAGE
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "media" && (
          <>
            {!media.length ? (
              <div style={{
                textAlign: "center", padding: "40px 0",
                fontSize: 12, color: "#252525",
                fontFamily: "monospace", letterSpacing: 1,
              }}>
                No media yet.
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 3,
              }}>
                {media.map((p) => {
                  const url = p.imageUrl ?? p.image_Url ?? "";
                  return (
                    <div key={p.id} style={{
                      aspectRatio: "1",
                      background: "#0d0d0d",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}>
                      <img src={url} alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "about" && (
          <div style={{
            padding: "8px 4px",
            fontSize: 13, color: "#2a2a2a",
            fontFamily: "monospace", lineHeight: 1.8,
          }}>
            {profile.bio?.trim() ? profile.bio : (
              <span style={{ color: "#1a1a1a" }}>No bio yet.</span>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
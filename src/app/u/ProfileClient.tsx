"use client";

import { useState } from "react";

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
  isFollowing = false,
  isCreator = false,
}: {
  profile: Profile;
  posts: ProfilePost[];
  isFollowing?: boolean;
  isCreator?: boolean;
}) {
  const [followed, setFollowed] = useState(isFollowing);

  const postsCount = posts?.length ?? 0;
  const followers = profile.followersCount ?? 0;
  const following = profile.followingCount ?? 0;
  const initial = (profile.displayName || profile.email || "U")[0]?.toUpperCase();

  const offerings = isCreator
    ? ["🎵 Music", "🎛️ Production", "🎤 Features", "🎬 Videos", "📻 Podcasts", "🎧 Sessions"]
    : ["🎵 Music", "🏋️ Fitness", "🎮 Gaming", "📸 Photography", "✈️ Travel", "🍔 Food"];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0806",
      color: "white",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      maxWidth: 480,
      margin: "0 auto",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
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
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 16,
          letterSpacing: 6,
          color: "white",
        }}>REVOLVR</div>
        <button style={{
          background: "transparent",
          border: "none",
          color: "#555",
          fontSize: 22,
          cursor: "pointer",
          lineHeight: 1,
          padding: "4px 2px",
        }}>≡</button>
      </div>

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
            color: "#00e5ff",
            textTransform: "uppercase",
          }}>CREATOR</div>
        )}

        {/* Arc Avatar 140px */}
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <div style={followed ? {
            position: "absolute",
            inset: -5,
            borderRadius: "50%",
            border: "2.5px solid #00e5ff",
            filter: "drop-shadow(0 0 6px #00e5ff)",
            boxShadow: "0 0 12px rgba(0,229,255,0.4)",
          } : {
            position: "absolute",
            inset: -5,
            borderRadius: "50%",
            border: "2.5px solid transparent",
            borderTopColor: "#00e5ff",
            borderRightColor: "#00e5ff",
            filter: "drop-shadow(0 0 6px #00e5ff)",
            animation: "arcSpin 1.8s linear infinite",
          }} />

          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 112, height: 112,
            borderRadius: "50%",
            background: profile.avatarUrl
              ? `url(${profile.avatarUrl}) center/cover`
              : "linear-gradient(135deg, #1a1a2e, #16213e)",
            border: "1.5px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 42, fontWeight: 700,
          }}>
            {!profile.avatarUrl && initial}
          </div>
        </div>

        {/* Name + handle */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 32, letterSpacing: 1, color: "white",
          }}>
            {profile.displayName}
          </div>
          <div style={{
            fontSize: 11, color: "#00e5ff",
            fontFamily: "monospace", letterSpacing: 1, marginTop: 4,
          }}>
            @{profile.handle}
          </div>
        </div>

        {/* Audio intro — full width rounded pill */}
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
          <span style={{ fontSize: 11, color: "#00e5ff", fontFamily: "monospace", letterSpacing: 2 }}>Intro</span>
          <span style={{ fontSize: 10, color: "#333" }}>▶</span>
          <div style={{ flex: 1, height: 1, background: "#1a1510" }} />
          <span style={{ fontSize: 10, color: "#333", fontFamily: "monospace" }}>0:30</span>
        </div>

        {/* Stats row — 3 equal circular pills */}
        {isCreator ? (
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {([
              { val: "0", label: "VOLTAGE" },
              { val: String(followers), label: "FOLLOWERS" },
              { val: String(postsCount), label: "POSTS" },
            ] as { val: string; label: string }[]).map((s, i) => (
              <div key={i} style={{
                width: 80, height: 80,
                borderRadius: "50%",
                background: "#f5f0e8",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 22,
                  color: "#0a0806",
                }}>{s.val}</div>
                <div style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  letterSpacing: 2,
                  color: "#888",
                  marginTop: 2,
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {[
              { val: String(followers), label: "FOLLOWERS" },
              { val: String(following), label: "FOLLOWING" },
              { val: String(postsCount), label: "POSTS" },
            ].map((s, i) => (
              <div key={i} style={{
                width: 80, height: 80,
                borderRadius: "50%",
                background: "#f5f0e8",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 22,
                  color: "#0a0806",
                }}>{s.val}</div>
                <div style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  letterSpacing: 2,
                  color: "#888",
                  marginTop: 2,
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 320 }}>
          <button
            onClick={() => setFollowed(prev => !prev)}
            style={{
              flex: 1, padding: "11px 0",
              borderRadius: 50,
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
              fontFamily: "monospace",
            }}
          >
            {followed ? "Following" : "Follow"}
          </button>
          <button style={{
            flex: 1, padding: "11px 0",
            borderRadius: 50,
            background: "transparent",
            border: "1px solid #1a1a1a",
            color: "#555",
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
            fontSize: 14, color: "#444",
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
          {posts.map((p) => {
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

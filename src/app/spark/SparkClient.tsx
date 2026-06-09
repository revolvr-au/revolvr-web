"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import FeedLayout from "@/components/FeedLayout";
import RingRim from "@/components/RingRim";
import { useRingStatus } from "@/hooks/useRingStatus";
import { hasRing } from "@/lib/ringGates";
import { useRouter } from "next/navigation";

type SparkPost = {
  id: string;
  caption: string;
  imageUrl: string | null;
  media_url: string | null;
  postType: "FEED" | "SPARK" | "RAW" | "PODCAST";
  voltage: number;
  expiresAt: string | null;
  userEmail: string;
  handle: string;
  avatarUrl: string | null;
  displayName: string;
  ringTier: string;
  createdAt: string;
};

type VoltageTier = "HOT" | "RISING" | "NEW";

function getVoltageTier(voltage: number): VoltageTier {
  if (voltage >= 50) return "HOT";
  if (voltage >= 10) return "RISING";
  return "NEW";
}

const TIER_DIM: Record<VoltageTier, { w: string; h: number }> = {
  HOT:    { w: "100%",                  h: 280 },
  RISING: { w: "calc(50% - 4px)",       h: 200 },
  NEW:    { w: "calc(33.33% - 5.33px)", h: 140 },
};

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  FEED:    { label: "RESONANCE", color: "#3B82F6" },
  SPARK:   { label: "SPARK",     color: "#F59E0B" },
  RAW:     { label: "RAW",       color: "#EF4444" },
  PODCAST: { label: "PODCAST",   color: "#8B5CF6" },
};

function useCountdown(expiresAt: string | null): string | null {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("EXPIRED"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

function SparkCard({
  post,
  onClick,
}: {
  post: SparkPost;
  onClick: (post: SparkPost) => void;
}) {
  const tier = getVoltageTier(post.voltage);
  const dim = TIER_DIM[tier];
  const badge = TYPE_BADGE[post.postType] ?? TYPE_BADGE.FEED;
  const countdown = useCountdown(post.postType === "RAW" ? post.expiresAt : null);
  const showHandle = tier === "HOT";
  const showAvatar = tier !== "NEW";

  return (
    <div
      onClick={() => onClick(post)}
      style={{
        width: dim.w,
        height: dim.h,
        flexShrink: 0,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        background: "#0d1224",
        border: "1px solid rgba(255,255,255,0.06)",
        animation: tier === "HOT" ? "sparkPulse 3s ease-in-out infinite" : undefined,
      }}
    >
      {/* Thumbnail */}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {/* Podcast waveform placeholder */}
      {!post.imageUrl && post.postType === "PODCAST" && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              width: 3,
              height: `${20 + Math.sin(i * 0.8) * 18 + Math.cos(i * 1.3) * 10}px`,
              background: "#8B5CF6",
              borderRadius: 2,
              opacity: 0.7,
            }} />
          ))}
        </div>
      )}

      {/* Dark gradient */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)",
      }} />

      {/* RAW countdown — top right */}
      {post.postType === "RAW" && countdown && (
        <div style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "rgba(239,68,68,0.9)",
          borderRadius: 6,
          padding: "2px 7px",
          fontSize: 9,
          fontFamily: "monospace",
          letterSpacing: 1,
          color: "white",
          fontWeight: 700,
        }}>
          {countdown}
        </div>
      )}

      {/* Content type badge — top left */}
      <div style={{
        position: "absolute",
        top: 8,
        left: 8,
        background: badge.color + "22",
        border: `1px solid ${badge.color}66`,
        borderRadius: 4,
        padding: "2px 7px",
        fontSize: 9,
        fontFamily: "monospace",
        letterSpacing: 1,
        color: badge.color,
        fontWeight: 700,
        textTransform: "uppercase",
      }}>
        {badge.label}
      </div>

      {/* Bottom row */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        {showAvatar && (
          <RingRim tier={post.ringTier} size={28}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              overflow: "hidden",
              background: "#1a1f35",
              flexShrink: 0,
            }}>
              {post.avatarUrl ? (
                <img src={post.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.6)",
                }}>
                  {post.handle[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </RingRim>
        )}

        {showHandle && (
          <span style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.85)",
            fontFamily: "monospace",
            letterSpacing: 0.5,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            @{post.handle}
          </span>
        )}

        {/* Voltage indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginLeft: "auto",
          flexShrink: 0,
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#F59E0B",
            animation: "voltPulse 1.5s ease-in-out infinite",
          }} />
          <span style={{
            fontSize: tier === "NEW" ? 10 : 12,
            color: "#F59E0B",
            fontFamily: "monospace",
            fontWeight: 700,
          }}>
            {post.voltage}V
          </span>
        </div>
      </div>
    </div>
  );
}

function FullScreenCard({
  post,
  onClose,
}: {
  post: SparkPost;
  onClose: () => void;
}) {
  const touchStartY = useRef(0);
  const [translateY, setTranslateY] = useState(0);
  const badge = TYPE_BADGE[post.postType] ?? TYPE_BADGE.FEED;
  const countdown = useCountdown(post.postType === "RAW" ? post.expiresAt : null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setTranslateY(delta);
  };

  const onTouchEnd = () => {
    if (translateY > 80) {
      onClose();
    } else {
      setTranslateY(0);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.96)",
        display: "flex",
        flexDirection: "column",
        transform: `translateY(${translateY}px)`,
        transition: translateY === 0 ? "transform 0.2s ease" : "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Swipe-down handle */}
      <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)" }} />
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px 14px" }}>
        <RingRim tier={post.ringTier} size={40}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "#1a1f35" }}>
            {post.avatarUrl ? (
              <img src={post.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.6)",
                fontSize: 16,
              }}>
                {post.handle[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </RingRim>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: "white", fontWeight: 600 }}>@{post.handle}</div>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: badge.color, letterSpacing: 1 }}>
            {badge.label}
            {post.postType === "RAW" && countdown && ` · ${countdown}`}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#F59E0B", animation: "voltPulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize: 14, color: "#F59E0B", fontFamily: "monospace", fontWeight: 700 }}>
            {post.voltage}V
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            color: "white",
            fontSize: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Media */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", overflow: "hidden" }}>
        {post.media_url ? (
          <video
            src={post.media_url}
            autoPlay
            loop
            playsInline
            controls
            style={{ width: "100%", maxHeight: "62vh", borderRadius: 12, objectFit: "contain" }}
          />
        ) : post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt=""
            style={{ width: "100%", maxHeight: "62vh", borderRadius: 12, objectFit: "contain" }}
          />
        ) : (
          /* Podcast waveform */
          <div style={{
            width: "100%",
            height: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            borderRadius: 12,
            background: "#0d1224",
          }}>
            {Array.from({ length: 22 }).map((_, i) => (
              <div key={i} style={{
                width: 4,
                height: `${22 + Math.sin(i * 0.7) * 32 + Math.cos(i * 1.4) * 18}px`,
                background: "#8B5CF6",
                borderRadius: 2,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Caption */}
      {post.caption && (
        <div style={{
          padding: "14px 20px 24px",
          fontSize: 14,
          color: "rgba(255,255,255,0.75)",
          lineHeight: 1.6,
        }}>
          {post.caption}
        </div>
      )}
    </div>
  );
}

function UpgradeModal({
  ringRequired,
  feature,
  onClose,
}: {
  ringRequired: "BLUE" | "GOLD";
  feature: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const isGold = ringRequired === "GOLD";
  const color = isGold ? "#F59E0B" : "#3B82F6";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0d1224",
          border: `1px solid ${color}30`,
          borderRadius: 16,
          padding: 28,
          maxWidth: 320,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>{isGold ? "🥇" : "⚡"}</div>
        <div style={{
          fontFamily: "monospace",
          fontSize: 18,
          letterSpacing: 2,
          color,
          marginBottom: 10,
          fontWeight: 700,
        }}>
          {isGold ? "GOLD" : "BLUE"} RING REQUIRED
        </div>
        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7, margin: "0 0 20px" }}>
          {feature} requires a {isGold ? "Gold" : "Blue"} Ring.
        </p>
        <button
          onClick={() => { onClose(); router.push("/rings"); }}
          style={{
            background: color,
            border: "none",
            borderRadius: 999,
            padding: "12px 28px",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "monospace",
            letterSpacing: 1,
            color: isGold ? "#0a0806" : "white",
            cursor: "pointer",
            width: "100%",
          }}
        >
          GET {isGold ? "GOLD" : "BLUE"} RING
        </button>
      </div>
    </div>
  );
}

export function SparkContent() {
  const router = useRouter();
  const { ringTier, loading: ringLoading } = useRingStatus();
  const hasBlueRing = !ringLoading && hasRing(ringTier, "BLUE");
  const hasGoldRing = !ringLoading && hasRing(ringTier, "GOLD");

  const [posts, setPosts] = useState<SparkPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [expandedPost, setExpandedPost] = useState<SparkPost | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{ ring: "BLUE" | "GOLD"; feature: string } | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/spark");
      if (!res.ok) return;
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {
      // silent
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    refreshRef.current = setInterval(fetchPosts, 30_000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchPosts]);

  const guardedAction = (ring: "BLUE" | "GOLD", feature: string, action: () => void) => {
    const ok = ring === "BLUE" ? hasBlueRing : hasGoldRing;
    if (ok) action();
    else setUpgradeModal({ ring, feature });
  };

  const hotPosts    = posts.filter((p) => getVoltageTier(p.voltage) === "HOT");
  const risingPosts = posts.filter((p) => getVoltageTier(p.voltage) === "RISING");
  const newPosts    = posts.filter((p) => getVoltageTier(p.voltage) === "NEW");

  return (
    <FeedLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        @keyframes sparkPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.012); }
        }
        @keyframes voltPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(1.5); }
        }
      `}</style>

      <div style={{
        height: "100dvh",
        overflowY: "auto",
        paddingTop: 72,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        scrollbarWidth: "none",
      }}>
        {/* Header */}
        <div style={{ padding: "0 20px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 4 }}>
            <h1 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 64,
              letterSpacing: 3,
              color: "white",
              margin: 0,
              lineHeight: 1,
            }}>
              SPARK
            </h1>

            {/* POST button — Blue Ring gate */}
            {!ringLoading && (
              <button
                onClick={() => guardedAction("BLUE", "Posting to SPARK", () => router.push("/create?type=spark"))}
                style={{
                  background: hasBlueRing ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${hasBlueRing ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  color: hasBlueRing ? "#3B82F6" : "rgba(255,255,255,0.35)",
                  cursor: "pointer",
                  marginBottom: 10,
                }}
              >
                + POST
              </button>
            )}
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: "0 0 20px", lineHeight: 1.6 }}>
            High-voltage posts. Sorted by energy.
          </p>

          {/* Ring-gated post type buttons */}
          {!ringLoading && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <button
                onClick={() => guardedAction("BLUE", "RAW posts (6h ephemeral)", () => router.push("/create?type=raw"))}
                style={{
                  background: hasBlueRing ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${hasBlueRing ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 6,
                  padding: "5px 12px",
                  fontSize: 10,
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  color: hasBlueRing ? "#EF4444" : "rgba(255,255,255,0.2)",
                  cursor: "pointer",
                }}
              >
                RAW {!hasBlueRing && "🔒"}
              </button>
              <button
                onClick={() => guardedAction("GOLD", "Podcast clips", () => router.push("/create?type=podcast"))}
                style={{
                  background: hasGoldRing ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${hasGoldRing ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 6,
                  padding: "5px 12px",
                  fontSize: 10,
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  color: hasGoldRing ? "#8B5CF6" : "rgba(255,255,255,0.2)",
                  cursor: "pointer",
                }}
              >
                PODCAST {!hasGoldRing && "🔒"}
              </button>
              <button
                onClick={() => guardedAction("GOLD", "RESONANCE initiation", () => router.push("/create?type=resonance"))}
                style={{
                  background: hasGoldRing ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${hasGoldRing ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 6,
                  padding: "5px 12px",
                  fontSize: 10,
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  color: hasGoldRing ? "#3B82F6" : "rgba(255,255,255,0.2)",
                  cursor: "pointer",
                }}
              >
                RESONANCE {!hasGoldRing && "🔒"}
              </button>
            </div>
          )}
        </div>

        {/* Loading */}
        {loadingPosts && (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", letterSpacing: 2 }}>
              LOADING SPARK…
            </span>
          </div>
        )}

        {/* Empty state */}
        {!loadingPosts && posts.length === 0 && (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", letterSpacing: 1.5 }}>
              NO HIGH-VOLTAGE POSTS YET
            </p>
          </div>
        )}

        {/* Voltage-tiered grid */}
        {!loadingPosts && posts.length > 0 && (
          <div style={{ padding: "0 12px" }}>
            {/* HOT — full width */}
            {hotPosts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                {hotPosts.map((p) => <SparkCard key={p.id} post={p} onClick={setExpandedPost} />)}
              </div>
            )}

            {/* RISING — 2-col */}
            {risingPosts.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {risingPosts.map((p) => <SparkCard key={p.id} post={p} onClick={setExpandedPost} />)}
              </div>
            )}

            {/* NEW — 3-col */}
            {newPosts.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {newPosts.map((p) => <SparkCard key={p.id} post={p} onClick={setExpandedPost} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-screen expansion */}
      {expandedPost && (
        <FullScreenCard post={expandedPost} onClose={() => setExpandedPost(null)} />
      )}

      {/* Ring gate modal */}
      {upgradeModal && (
        <UpgradeModal
          ringRequired={upgradeModal.ring}
          feature={upgradeModal.feature}
          onClose={() => setUpgradeModal(null)}
        />
      )}
    </FeedLayout>
  );
}

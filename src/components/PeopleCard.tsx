"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import GathWindow from "@/components/GathWindow";

export type PeopleCardUser = {
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  voltage?: number;
  isLive?: boolean;
  ringTier?: string;
  posts?: PeopleCardPost[];
  mutuals?: PeopleCardMini[];
  recentLinkers?: PeopleCardMini[];
};

export type PeopleCardMini = {
  handle: string;
  avatarUrl?: string;
};

export type PeopleCardPost = {
  id: string;
  type: "video" | "tranche" | "image" | "timed";
  views?: number;
  releaseDate?: string;
};

type LinkState = "LINK" | "WATCHING" | "CONSIDERING" | "LINKED";

const LINK_STATES: LinkState[] = ["LINK", "WATCHING", "CONSIDERING", "LINKED"];

const GOLD = "#ffffff";

const ORBIT_RADIUS = 115;
const ROTATION_DEG_PER_SEC = 8;
const SLOTS = 6;

const SLOT_TINTS = [
  "rgba(30,20,50,0.95)",
  "rgba(20,35,50,0.95)",
  "rgba(20,45,30,0.95)",
  "rgba(50,25,15,0.95)",
  "rgba(50,15,20,0.95)",
  "rgba(30,30,15,0.95)",
];

function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="rgba(255,255,255,0.75)">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SparkIcon({ size = 12, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
    </svg>
  );
}

function SquareIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function ClockIcon({ size = 14, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function GathIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="9" r="2.2" />
      <circle cx="18" cy="9" r="2.2" />
      <circle cx="12" cy="7" r="2.4" />
      <path d="M3 19c1.5-2.5 3.5-3.5 6-3.5 1 0 1.8.1 2.5.4" />
      <path d="M21 19c-1.5-2.5-3.5-3.5-6-3.5-1 0-1.8.1-2.5.4" />
      <path d="M8 19c1-2 2.4-3 4-3s3 1 4 3" />
    </svg>
  );
}

function BattleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4l6 0 0 6-9 9-3-3z" />
      <path d="M4 4l-0 6 9 9 3-3-6-6" transform="translate(0)" />
      <path d="M3 21l4-4" />
      <path d="M21 21l-4-4" />
    </svg>
  );
}

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function PostSlotIcon({ type }: { type: PeopleCardPost["type"] }) {
  if (type === "video") return <PlayIcon size={16} />;
  if (type === "tranche") return <SparkIcon size={14} color="rgba(255,255,255,0.85)" />;
  if (type === "timed") return <ClockIcon size={14} />;
  return <SquareIcon size={14} />;
}

function MiniStack({
  people,
  side,
  borderColor,
}: {
  people: PeopleCardMini[];
  side: "left" | "right";
  borderColor: string;
}) {
  const visible = people.slice(0, 3);
  if (visible.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexDirection: side === "left" ? "row" : "row-reverse",
      }}
    >
      {visible.map((p, i) => (
        <div
          key={p.handle + i}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: `1.5px solid ${borderColor}`,
            background: p.avatarUrl
              ? `url(${p.avatarUrl}) center/cover`
              : "linear-gradient(135deg, #1a2030, #0c1020)",
            marginLeft: side === "left" && i > 0 ? -6 : 0,
            marginRight: side === "right" && i > 0 ? -6 : 0,
            boxSizing: "border-box",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

function VoltageFlow({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    const id = window.setInterval(() => {
      setValue((v) => v + Math.max(1, Math.round((to - v) * 0.06) + 1));
    }, 2200);
    return () => window.clearInterval(id);
  }, [to]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: 6,
        padding: "3px 10px",
        borderRadius: 999,
        border: `1px solid rgba(255,255,255,0.25)`,
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <SparkIcon size={10} color={GOLD} />
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 8,
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.85)",
        }}
      >
        LINK VOLTAGE
      </span>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 10,
          color: GOLD,
          fontWeight: 700,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function PeopleCard({
  user,
  onClose,
}: {
  user: PeopleCardUser;
  onClose: () => void;
}) {
  const [bioPlaying, setBioPlaying] = useState(false);
  const [bioCount, setBioCount] = useState(233);
  const [linkStateIndex, setLinkStateIndex] = useState(0);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [gathOpen, setGathOpen] = useState(false);
  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const goToProfile = () => router.push(`/u/${user.handle}`);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setViewerEmail(data.user?.email ?? null);
    });
  }, []);
  const [avatarCenter, setAvatarCenter] = useState<{ x: number; y: number } | null>(null);
  const [slotCenters, setSlotCenters] = useState<Record<number, { x: number; y: number }>>({});
  const rotationRef = useRef(0);
  const orbitWrapperRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const linkState: LinkState = LINK_STATES[linkStateIndex];
  const isLinked = linkState === "LINKED";

  const posts: PeopleCardPost[] = useMemo(() => {
    if (user.posts && user.posts.length > 0) return user.posts.slice(0, SLOTS);
    const fallback: PeopleCardPost[] = [
      { id: "p1", type: "image" },
      { id: "p2", type: "video" },
      { id: "p3", type: "tranche" },
      { id: "p4", type: "video", views: 12400 },
      { id: "p5", type: "timed", releaseDate: "2026-06-01" },
      { id: "p6", type: "image" },
    ];
    return fallback;
  }, [user.posts]);

  const leftStack: PeopleCardMini[] = useMemo(() => {
    const mutuals = user.mutuals ?? [];
    const recentLinkers = user.recentLinkers ?? [];
    const out: PeopleCardMini[] = [...mutuals];
    let i = 0;
    while (out.length < 3 && i < recentLinkers.length) {
      out.push(recentLinkers[i]);
      i += 1;
    }
    return out.slice(0, 3);
  }, [user.mutuals, user.recentLinkers]);

  const rightStack: PeopleCardMini[] = useMemo(
    () => (user.recentLinkers ?? []).slice(0, 3),
    [user.recentLinkers],
  );

  const avatarBorder = isLinked
    ? "rgba(255,255,255,0.4)"
    : "rgba(255,255,255,0.08)";

  const linkStyles = useMemo(() => {
    switch (linkState) {
      case "LINK":
        return {
          background: GOLD,
          color: "#0a0e16",
          border: `1px solid ${GOLD}`,
          boxShadow: "0 4px 20px rgba(255,255,255,0.28)",
          avatarBorder: GOLD,
        };
      case "WATCHING":
        return {
          background: "rgba(22,28,40,0.95)",
          color: "#fff",
          border: "1px solid #fff",
          boxShadow: "none",
          avatarBorder: "#fff",
        };
      case "CONSIDERING":
        return {
          background: "rgba(22,28,40,0.95)",
          color: "#fff",
          border: "1px solid #fff",
          boxShadow: "none",
          avatarBorder: "#fff",
        };
      case "LINKED":
        return {
          background: "rgba(22,28,40,0.95)",
          color: GOLD,
          border: `1px solid ${GOLD}`,
          boxShadow: "none",
          avatarBorder: GOLD,
        };
    }
  }, [linkState]);

  const handleBio = () => {
    setBioCount((c) => c + 1);
    setBioPlaying(true);
    window.setTimeout(() => setBioPlaying(false), 1400);
  };

  const handleLink = () => {
    setLinkStateIndex((i) => (i + 1) % LINK_STATES.length);
  };

  const handleSlot = (index: number) => {
    setActiveSlot((cur) => (cur === index ? null : index));
  };

  // Compute geometry for spoke
  useEffect(() => {
    if (!cardRef.current) return;
    const root = cardRef.current;

    const avatarEl = root.querySelector('[data-people-card="avatar"]') as HTMLElement | null;
    if (!avatarEl) return;
    const rootRect = root.getBoundingClientRect();
    const avRect = avatarEl.getBoundingClientRect();
    setAvatarCenter({
      x: avRect.left - rootRect.left + avRect.width / 2,
      y: avRect.top - rootRect.top + avRect.height / 2,
    });

    const newSlots: Record<number, { x: number; y: number }> = {};
    for (let i = 0; i < SLOTS; i += 1) {
      const el = root.querySelector(`[data-slot="${i}"]`) as HTMLElement | null;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      newSlots[i] = {
        x: r.left - rootRect.left + r.width / 2,
        y: r.top - rootRect.top + r.height / 2,
      };
    }
    setSlotCenters(newSlots);
  }, [activeSlot, posts.length]);

  useEffect(() => {
    if (activeSlot !== null) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      rotationRef.current = (rotationRef.current + ROTATION_DEG_PER_SEC * dt) % 360;
      if (orbitWrapperRef.current) {
        orbitWrapperRef.current.style.transform = `rotateZ(${rotationRef.current}deg)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [activeSlot]);

  const activePost = activeSlot != null ? posts[activeSlot] : null;
  const spoke = activeSlot != null && avatarCenter && slotCenters[activeSlot]
    ? { from: avatarCenter, to: slotCenters[activeSlot] }
    : null;

  const initial = (user.displayName || user.handle || "?").charAt(0).toUpperCase();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "peopleCardFadeIn 220ms ease-out",
      }}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 310,
          background: "rgba(10,14,22,0.99)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 22,
          boxShadow: "0 28px 70px rgba(0,0,0,0.85)",
          overflow: "hidden",
          fontFamily: "monospace",
          color: "#fff",
          animation: "peopleCardPop 260ms cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        {/* Scanline overlay */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 3px)",
            mixBlendMode: "overlay",
            animation: "peopleCardScan 7s linear infinite",
            zIndex: 1,
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 30,
          }}
        >
          <CloseIcon />
        </button>

        {/* Spoke SVG overlay */}
        {spoke && (
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            <defs>
              <path
                id="peopleCardSpokePath"
                d={`M${spoke.from.x} ${spoke.from.y} L${spoke.to.x} ${spoke.to.y}`}
              />
            </defs>
            <line
              x1={spoke.from.x}
              y1={spoke.from.y}
              x2={spoke.to.x}
              y2={spoke.to.y}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="1.8"
              strokeDasharray="4 4"
              strokeLinecap="round"
              style={{
                animation: "peopleCardDashMove 0.9s linear infinite",
              }}
            />
            <circle r="3" fill="#ffffff" opacity="0.8">
              <animateMotion dur="0.8s" repeatCount="indefinite">
                <mpath href="#peopleCardSpokePath" />
              </animateMotion>
            </circle>
          </svg>
        )}

        {/* ORBIT ZONE - centred avatar + 6 posts revolving on a 360° ring */}
        <div
          style={{
            position: "relative",
            height: 260,
            margin: "10px 0 0",
            zIndex: 10,
          }}
        >
          {/* Orbit ring track */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              width: ORBIT_RADIUS * 2,
              height: ORBIT_RADIUS * 2,
              left: `calc(50% - ${ORBIT_RADIUS}px)`,
              top: `calc(50% - ${ORBIT_RADIUS}px)`,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.12)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              width: ORBIT_RADIUS * 2 - 4,
              height: ORBIT_RADIUS * 2 - 4,
              left: `calc(50% - ${ORBIT_RADIUS - 2}px)`,
              top: `calc(50% - ${ORBIT_RADIUS - 2}px)`,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.05)",
              pointerEvents: "none",
            }}
          />

          {/* Avatar presence glow */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              width: 140,
              height: 140,
              left: "calc(50% - 70px)",
              top: "calc(50% - 70px)",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, transparent 70%)",
              pointerEvents: "none",
              animation: "avatarPulse 3s ease-in-out infinite",
            }}
          />

          {/* Centred avatar wrapper */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 100,
              height: 100,
            }}
          >
            {/* Avatar */}
            <div
              data-people-card="avatar"
              onClick={goToProfile}
              role="button"
              tabIndex={0}
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                border: `1px solid ${avatarBorder}`,
                background: user.avatarUrl
                  ? `url(${user.avatarUrl}) center/cover`
                  : "linear-gradient(135deg, #1a2030 0%, #0a0e18 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                color: "rgba(255,255,255,0.6)",
                fontWeight: 700,
                transition: "border 220ms ease",
                boxSizing: "border-box",
                cursor: "pointer",
              }}
            >
              {!user.avatarUrl && initial}
            </div>

            {/* Voltage badge */}
            <div
              style={{
                position: "absolute",
                right: -6,
                bottom: -2,
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #ffffff 0%, #d9a700 100%)",
                color: "#0a0e16",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.05em",
                boxShadow: "0 4px 10px rgba(255,255,255,0.32)",
              }}
            >
              <SparkIcon size={9} color="#0a0e16" />
              {user.voltage ?? 0}
            </div>

            {/* BIO badge */}
            <button
              onClick={handleBio}
              style={{
                position: "absolute",
                top: -4,
                left: -10,
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(10,14,22,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                fontFamily: "monospace",
                color: "#fff",
                animation: bioPlaying ? "peopleCardBioPulse 1.2s ease-out" : "none",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: bioPlaying ? GOLD : "rgba(255,255,255,0.5)",
                }}
              />
              <span style={{ fontSize: 7, letterSpacing: "0.18em", color: "rgba(255,255,255,0.7)" }}>
                BIO
              </span>
              {bioPlaying ? (
                <span style={{ display: "flex", alignItems: "center", gap: 1.5, height: 8 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      style={{
                        display: "block",
                        width: 1.5,
                        height: 6,
                        background: GOLD,
                        borderRadius: 1,
                        animation: `peopleCardWaveBar 0.6s ease-in-out ${i * 0.08}s infinite`,
                      }}
                    />
                  ))}
                </span>
              ) : (
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.6)" }}>{bioCount}</span>
              )}
            </button>
          </div>

          {/* 6 posts revolving on a full 360° ring — wrapper rotates via ref, no re-renders */}
          <div
            ref={orbitWrapperRef}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              willChange: "transform",
            }}
          >
            {posts.map((post, i) => {
              const angleDeg = i * 60;
              const rad = (angleDeg * Math.PI) / 180;
              const x = Math.cos(rad) * ORBIT_RADIUS;
              const y = Math.sin(rad) * ORBIT_RADIUS;
              const isTimed = post.type === "timed";
              const isActive = activeSlot === i;

              return (
                <button
                  key={post.id}
                  data-slot={i}
                  onClick={() => handleSlot(i)}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${isActive ? 1.3 : 1})`,
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: SLOT_TINTS[i % 6],
                    border: isActive
                      ? `1.5px solid rgba(255,255,255,0.9)`
                      : isTimed
                      ? `1px solid rgba(255,255,255,0.55)`
                      : "1px solid rgba(255,255,255,0.06)",
                    boxShadow: isActive
                      ? "0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.15)"
                      : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                    animation: isTimed ? "peopleCardTimedGlow 2.2s ease-in-out infinite" : "none",
                    transition: "all 220ms cubic-bezier(0.34,1.56,0.64,1)",
                    boxSizing: "border-box",
                    pointerEvents: "auto",
                  }}
                >
                  <PostSlotIcon type={post.type} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Name + handle BELOW orbit zone */}
        <div
          onClick={goToProfile}
          role="button"
          tabIndex={0}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "16px 16px 8px",
            zIndex: 10,
            position: "relative",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "0.02em",
            }}
          >
            {user.displayName ?? user.handle}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
            @{user.handle}
          </div>

          {isLinked && <VoltageFlow from={user.voltage ?? 0} to={(user.voltage ?? 0) + 88} />}
        </div>

        {/* Detail strip */}
        <div
          style={{
            position: "relative",
            minHeight: 22,
            margin: "0 16px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          {activePost ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "4px 10px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 999,
                fontSize: 8,
                letterSpacing: "0.16em",
                color: "rgba(255,255,255,0.65)",
                textTransform: "uppercase",
                animation: "peopleCardFadeIn 200ms ease-out",
              }}
            >
              <span>{activePost.type}</span>
              {typeof activePost.views === "number" && (
                <>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <span>{activePost.views.toLocaleString()} views</span>
                </>
              )}
              {activePost.type === "timed" && activePost.releaseDate && (
                <>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <span style={{ color: GOLD }}>release {activePost.releaseDate}</span>
                </>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 8, letterSpacing: "0.2em", color: "rgba(255,255,255,0.6)" }}>
              TAP A POST
            </span>
          )}
        </div>

        {/* LINK BAR */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 10,
            padding: "8px 14px 14px",
            zIndex: 10,
            position: "relative",
          }}
        >
          {/* GATH */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 44 }}>
            <button
              onClick={() => setGathOpen(true)}
              aria-label="Open GATH"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "rgba(22,28,40,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <GathIcon />
            </button>
            <span style={{ fontSize: 7, letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)" }}>
              GATH
            </span>
          </div>

          {/* LINK */}
          <button
            onClick={handleLink}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 10px",
              height: 34,
              alignSelf: "center",
              borderRadius: 999,
              background: linkStyles.background,
              color: linkStyles.color,
              border: linkStyles.border,
              boxShadow: linkStyles.boxShadow,
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.22em",
              transition: "all 220ms ease",
              animation: "peopleCardLinkPop 240ms ease-out",
            }}
            key={linkState}
          >
            <MiniStack people={leftStack} side="left" borderColor={linkStyles.avatarBorder} />
            <span>{linkState}</span>
            <MiniStack people={rightStack} side="right" borderColor={linkStyles.avatarBorder} />
          </button>

          {/* BATTLE — disabled for launch: no route/handler yet, parked product
              decision. Inert affordance is intentional (a dead click is worse). */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 44, opacity: 0.4 }}>
            <button
              disabled
              aria-disabled="true"
              title="Battle — coming soon"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "rgba(22,28,40,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "default",
                padding: 0,
              }}
            >
              <BattleIcon />
            </button>
            <span style={{ fontSize: 7, letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)" }}>
              BATTLE
            </span>
          </div>
        </div>

        {/* COMMERCE STRIP */}
        <div
          style={{
            display: "flex",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            zIndex: 10,
            position: "relative",
          }}
        >
          {/* TRANCHE links to /tranche; SHOP/MUSIC/BRAND/PODCAST have no launch
              surface yet — rendered disabled/inert pending the first-visitor
              review (no handler, no placeholder route). */}
          {[
            { label: "TRANCHE", href: "/tranche" },
            { label: "SHOP", href: null },
            { label: "MUSIC", href: null },
            { label: "BRAND", href: null },
            { label: "PODCAST", href: null },
          ].map((item, i, arr) => {
            const href = item.href;
            return (
              <button
                key={item.label}
                onClick={href ? () => router.push(href) : undefined}
                disabled={!href}
                aria-disabled={!href}
                title={href ? undefined : `${item.label} — coming soon`}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 0",
                  background: "transparent",
                  border: "none",
                  borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  cursor: href ? "pointer" : "default",
                  opacity: href ? 1 : 0.4,
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                  }}
                />
                <span style={{ fontSize: 7, letterSpacing: "0.22em", color: "rgba(255,255,255,0.6)" }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <style>{`
          @keyframes peopleCardFadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes peopleCardPop {
            0% { opacity: 0; transform: translateY(8px) scale(0.96); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes peopleCardLinkPop {
            0% { transform: scale(0.96); }
            60% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }
          @keyframes peopleCardBioPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.06); }
            100% { transform: scale(1); }
          }
          @keyframes peopleCardTimedGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.0); border-color: rgba(255,255,255,0.55); }
            50% { box-shadow: 0 0 14px 1px rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.85); }
          }
          @keyframes peopleCardDashMove {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -16; }
          }
          @keyframes peopleCardWaveBar {
            0%, 100% { transform: scaleY(0.4); }
            50% { transform: scaleY(1); }
          }
          @keyframes peopleCardScan {
            0% { background-position: 0 0; }
            100% { background-position: 0 60px; }
          }
          @keyframes avatarPulse {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.15); opacity: 1; }
          }
        `}</style>
      </div>

      <GathWindow
        open={gathOpen}
        onClose={() => setGathOpen(false)}
        userEmail={viewerEmail}
        prefillDescription={`with @${user.handle}`}
        mode="simple"
      />
    </div>
  );
}

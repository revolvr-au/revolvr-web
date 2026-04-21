"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import FeedLayout from "@/components/FeedLayout";
import { RevolvrIcon } from "@/components/RevolvrIcon";

type LivePerson = {
  handle: string;
  displayName: string;
  avatarUrl?: string;
  isLive: true;
  voltage: number;
};

type RisingPerson = {
  handle: string;
  displayName: string;
  avatarUrl?: string;
  isLive: boolean;
  voltage: number;
  scheduledLiveAt: string | null;
  latestComment: string | null;
  commentCount: number;
  shareCount: number;
  postCount: number;
};

type NewPerson = {
  handle: string;
  displayName: string;
  avatarUrl?: string;
  isLive: false;
  voltage: number;
};

type PeopleData = {
  live: LivePerson[];
  creators: RisingPerson[];
  newPeople: NewPerson[];
};

function Avatar({
  handle,
  avatarUrl,
  size = 56,
  arcRing = false,
}: {
  handle: string;
  avatarUrl?: string;
  size?: number;
  arcRing?: boolean;
}) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {arcRing && (
        <svg
          width={size + 8}
          height={size + 8}
          viewBox={`0 0 ${size + 8} ${size + 8}`}
          style={{
            position: "absolute",
            top: -4,
            left: -4,
            zIndex: 1,
            animation: "arcSpin 3s linear infinite",
          }}
        >
          <circle
            cx={(size + 8) / 2}
            cy={(size + 8) / 2}
            r={size / 2 + 2}
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${(size + 8) * 1.8} ${(size + 8) * 0.6}`}
          />
          <defs>
            <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="1" />
              <stop offset="60%" stopColor="#00e5ff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      )}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: avatarUrl
            ? `url(${avatarUrl}) center/cover`
            : "linear-gradient(135deg, #0d1b2e, #1a2744)",
          border: arcRing ? "none" : "2px solid rgba(0,229,255,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.35,
          fontWeight: 700,
          color: "rgba(255,255,255,0.7)",
          fontFamily: "Inter, system-ui, sans-serif",
          overflow: "hidden",
        }}
      >
        {!avatarUrl && (handle[0]?.toUpperCase() ?? "?")}
      </div>
    </div>
  );
}

function VoltageTag({ voltage }: { voltage: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <span style={{ fontSize: 10 }}>⚡</span>
      <span style={{ fontSize: 11, color: "#00e5ff", fontWeight: 700, fontFamily: "monospace" }}>
        {voltage.toLocaleString()}
      </span>
    </span>
  );
}

function LiveCard({ person, onClick }: { person: LivePerson; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 18px",
        background: "rgba(255,40,40,0.06)",
        borderRadius: 14,
        border: "1px solid rgba(255,60,60,0.25)",
        cursor: "pointer",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar handle={person.handle} avatarUrl={person.avatarUrl} size={100} />
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#ff3c3c",
            border: "2.5px solid #050814",
            animation: "livePulse 1.4s ease-in-out infinite",
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: "rgba(255,255,255,0.5)",
          fontFamily: "Inter, system-ui, sans-serif",
          marginBottom: 2,
        }}>
          {person.displayName}
        </div>
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: "white",
          fontFamily: "Inter, system-ui, sans-serif",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginBottom: 6,
        }}>
          @{person.handle}
        </div>
        <VoltageTag voltage={person.voltage} />
      </div>
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color: "#ff3c3c",
        background: "rgba(255,60,60,0.12)",
        border: "1.5px solid rgba(255,60,60,0.4)",
        borderRadius: 24,
        padding: "7px 18px",
        flexShrink: 0,
        fontFamily: "Inter, system-ui, sans-serif",
        letterSpacing: "0.5px",
      }}>
        JOIN
      </div>
    </div>
  );
}

function hoursUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
}

function RisingCard({ person, onClick }: { person: RisingPerson; onClick: () => void }) {
  const hrs = person.scheduledLiveAt ? hoursUntil(person.scheduledLiveAt) : null;
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        padding: "12px 8px 10px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        border: "1px solid rgba(0,229,255,0.1)",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <Avatar handle={person.handle} avatarUrl={person.avatarUrl} size={56} arcRing />
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: "white",
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
        textAlign: "center",
      }}>
        {person.displayName}
      </div>
      <div style={{
        fontSize: 10,
        color: "rgba(255,255,255,0.4)",
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
      }}>
        @{person.handle}
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        justifyContent: "center",
        fontSize: 10,
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 10 }}>⚡</span>
          <span style={{ color: "#00e5ff", fontFamily: "monospace", fontWeight: 700 }}>
            {person.voltage.toLocaleString()}
          </span>
        </span>

        {person.isLive && (
          <div style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#ff3c3c",
            flexShrink: 0,
            animation: "livePulse 1.4s ease-in-out infinite",
          }} />
        )}

        <span
          title={`${person.commentCount} comments`}
          style={{ display: "inline-flex", alignItems: "center", gap: 2, cursor: "default" }}
          onClick={e => e.stopPropagation()}
        >
          <RevolvrIcon name="chat" size={10} />
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{person.commentCount}</span>
        </span>

        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          <RevolvrIcon name="share" size={10} />
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{person.shareCount}</span>
        </span>
      </div>

      {/* Post count */}
      <div style={{
        fontSize: 9,
        fontFamily: "monospace",
        color: "rgba(255,255,255,0.4)",
        letterSpacing: "0.5px",
      }}>
        {person.postCount} POSTS
      </div>

      {hrs !== null && hrs >= 0 && (
        <div style={{
          fontSize: 9,
          color: "#ff3c3c",
          background: "rgba(255,60,60,0.1)",
          border: "1px solid rgba(255,60,60,0.3)",
          borderRadius: 20,
          padding: "2px 7px",
          fontFamily: "monospace",
          letterSpacing: "0.5px",
        }}>
          LIVE in {hrs}hrs 🔔
        </div>
      )}

      <button
        style={{
          width: "100%",
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(255,255,255,0.85)",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 20,
          height: 28,
          fontFamily: "Inter, system-ui, sans-serif",
          cursor: "pointer",
        }}
        onClick={e => { e.stopPropagation(); }}
      >
        Follow
      </button>

      {/* Scrolling marquee comment */}
      {person.latestComment && (
        <div style={{ overflow: "hidden", height: 16, width: "100%" }}>
          <div style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.5)",
            whiteSpace: "nowrap",
            fontFamily: "Inter, system-ui, sans-serif",
            animation: "marquee 12s linear infinite",
          }}>
            💬 {person.latestComment}
          </div>
        </div>
      )}
    </div>
  );
}

function NewCard({ person, onClick }: { person: NewPerson; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 7,
        padding: "14px 10px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        flexShrink: 0,
        width: 110,
      }}
    >
      <Avatar handle={person.handle} avatarUrl={person.avatarUrl} size={60} />
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: "white",
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
      }}>
        @{person.handle}
      </div>
      <VoltageTag voltage={person.voltage} />
      <button
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(255,255,255,0.6)",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: "3px 12px",
          fontFamily: "Inter, system-ui, sans-serif",
          cursor: "pointer",
          width: "100%",
        }}
        onClick={e => { e.stopPropagation(); }}
      >
        Follow
      </button>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 24,
      fontFamily: "'Bebas Neue', sans-serif",
      color: "#00e5ff",
      letterSpacing: "3px",
      marginBottom: 14,
    }}>
      {label}
    </div>
  );
}

let peopleCache: { data: PeopleData; ts: number } | null = null;
const PEOPLE_CACHE_TTL = 30_000;

export default function PeoplePage() {
  const router = useRouter();
  const [data, setData] = useState<PeopleData | null>(() => peopleCache?.data ?? null);
  const [loading, setLoading] = useState(peopleCache === null);

  const fetchData = useCallback(() => {
    fetch("/api/people-rail")
      .then(r => r.json())
      .then((d: PeopleData) => {
        peopleCache = { data: d, ts: Date.now() };
        setData(d);
      })
      .catch(() => setData({ live: [], creators: [], newPeople: [] }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (peopleCache && Date.now() - peopleCache.ts < PEOPLE_CACHE_TTL) {
      // Cache is fresh — no network request needed
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, PEOPLE_CACHE_TTL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const go = (handle: string) => router.push(`/u/${handle}`);

  const empty = !loading
    && (data?.live?.length ?? 0) === 0
    && (data?.creators?.length ?? 0) === 0
    && (data?.newPeople?.length ?? 0) === 0;

  return (
    <FeedLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes arcSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
      <div style={{
        height: "100dvh",
        overflowY: "auto",
        paddingTop: 72,
        paddingBottom: 80,
        paddingLeft: 16,
        paddingRight: 16,
        scrollbarWidth: "none",
      }}>
        {loading ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "60%",
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: "2px",
            color: "rgba(255,255,255,0.25)",
            textTransform: "uppercase",
          }}>
            Loading…
          </div>
        ) : empty ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 80,
            gap: 8,
          }}>
            <div style={{
              fontSize: 36,
              fontFamily: "'Bebas Neue', sans-serif",
              color: "rgba(255,255,255,0.15)",
              letterSpacing: "4px",
            }}>
              PEOPLE
            </div>
            <div style={{
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: "2px",
              color: "rgba(255,255,255,0.2)",
              textTransform: "uppercase",
            }}>
              No creators yet
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>

            {/* SECTION 1 — LIVE NOW */}
            {(data?.live?.length ?? 0) > 0 && (
              <section>
                <SectionHeader label="LIVE NOW" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data!.live.map(p => (
                    <LiveCard key={p.handle} person={p} onClick={() => go(p.handle)} />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 2 — RISING */}
            {(data?.creators?.length ?? 0) > 0 && (
              <section>
                <SectionHeader label="RISING" />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}>
                  {data!.creators.map(p => (
                    <RisingCard key={p.handle} person={p} onClick={() => go(p.handle)} />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 3 — NEW HERE */}
            {(data?.newPeople?.length ?? 0) > 0 && (
              <section>
                <SectionHeader label="NEW HERE" />
                <div style={{
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  paddingBottom: 4,
                }}>
                  {data!.newPeople.map(p => (
                    <NewCard key={p.handle} person={p} onClick={() => go(p.handle)} />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </FeedLayout>
  );
}

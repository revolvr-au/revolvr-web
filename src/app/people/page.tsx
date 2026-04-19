"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FeedLayout from "@/components/FeedLayout";

type Person = {
  handle: string;
  avatarUrl?: string;
  isLive: boolean;
  voltage: number;
};

type PeopleData = {
  live: Person[];
  creators: Person[];
  newPeople: Person[];
};

function Avatar({ handle, avatarUrl, size = 56 }: { handle: string; avatarUrl?: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: avatarUrl
          ? `url(${avatarUrl}) center/cover`
          : "linear-gradient(135deg, #0d1b2e, #1a2744)",
        border: "2px solid rgba(0,229,255,0.25)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        color: "rgba(255,255,255,0.7)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {!avatarUrl && (handle[0]?.toUpperCase() ?? "?")}
    </div>
  );
}

function LiveCard({ person, onClick }: { person: Person; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        border: "1px solid rgba(255,60,60,0.2)",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar handle={person.handle} avatarUrl={person.avatarUrl} size={48} />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#ff3c3c",
            border: "2px solid #050814",
            animation: "livePulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: "white",
          fontFamily: "Inter, system-ui, sans-serif",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          @{person.handle}
        </div>
        <div style={{
          fontSize: 11,
          color: "#ff3c3c",
          fontFamily: "monospace",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          marginTop: 2,
        }}>
          Live now
        </div>
      </div>
      <div style={{
        fontSize: 11,
        color: "rgba(255,255,255,0.5)",
        fontFamily: "Inter, system-ui, sans-serif",
        background: "rgba(255,60,60,0.12)",
        border: "1px solid rgba(255,60,60,0.3)",
        borderRadius: 20,
        padding: "3px 10px",
        flexShrink: 0,
      }}>
        Watch
      </div>
    </div>
  );
}

function CreatorCard({ person, onClick }: { person: Person; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "16px 12px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
      }}
    >
      <Avatar handle={person.handle} avatarUrl={person.avatarUrl} size={56} />
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
      {person.voltage > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10 }}>⚡</span>
          <span style={{ fontSize: 11, color: "#00e5ff", fontWeight: 600, fontFamily: "monospace" }}>
            {person.voltage}
          </span>
        </div>
      )}
      <div style={{
        fontSize: 11,
        color: "rgba(255,255,255,0.6)",
        background: "rgba(0,229,255,0.08)",
        border: "1px solid rgba(0,229,255,0.2)",
        borderRadius: 20,
        padding: "3px 12px",
        fontFamily: "Inter, system-ui, sans-serif",
        marginTop: 2,
      }}>
        Follow
      </div>
    </div>
  );
}

function NewCard({ person, onClick }: { person: Person; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
      }}
    >
      <Avatar handle={person.handle} avatarUrl={person.avatarUrl} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: "white",
          fontFamily: "Inter, system-ui, sans-serif",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          @{person.handle}
        </div>
        <div style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.35)",
          fontFamily: "monospace",
          letterSpacing: "1px",
          marginTop: 2,
        }}>
          New creator
        </div>
      </div>
      <div style={{
        fontSize: 11,
        color: "rgba(255,255,255,0.6)",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20,
        padding: "3px 12px",
        fontFamily: "Inter, system-ui, sans-serif",
        flexShrink: 0,
      }}>
        Follow
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 22,
      fontFamily: "'Bebas Neue', sans-serif",
      color: "#00e5ff",
      letterSpacing: "3px",
      marginBottom: 12,
    }}>
      {label}
    </div>
  );
}

export default function PeoplePage() {
  const router = useRouter();
  const [data, setData] = useState<PeopleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/people-rail")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData({ live: [], creators: [], newPeople: [] }))
      .finally(() => setLoading(false));
  }, []);

  const go = (handle: string) => router.push(`/u/${handle}`);

  return (
    <FeedLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
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
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* LIVE NOW */}
            {(data?.live?.length ?? 0) > 0 && (
              <section>
                <SectionHeader label="LIVE NOW" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data!.live.map(p => (
                    <LiveCard key={p.handle} person={p} onClick={() => go(p.handle)} />
                  ))}
                </div>
              </section>
            )}

            {/* CREATORS */}
            {(data?.creators?.length ?? 0) > 0 && (
              <section>
                <SectionHeader label="CREATORS" />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}>
                  {data!.creators.map(p => (
                    <CreatorCard key={p.handle} person={p} onClick={() => go(p.handle)} />
                  ))}
                </div>
              </section>
            )}

            {/* NEW TO REVOLVR */}
            {(data?.newPeople?.length ?? 0) > 0 && (
              <section>
                <SectionHeader label="NEW TO REVOLVR" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data!.newPeople.map(p => (
                    <NewCard key={p.handle} person={p} onClick={() => go(p.handle)} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {!loading && (data?.live?.length ?? 0) === 0 && (data?.creators?.length ?? 0) === 0 && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 80,
                gap: 8,
              }}>
                <div style={{
                  fontSize: 32,
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
            )}
          </div>
        )}
      </div>
    </FeedLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Person = {
  handle: string;
  avatarUrl?: string;
  isLive: boolean;
};

export default function PeopleRail() {
  const [people, setPeople] = useState<Person[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/people-rail")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.people)) setPeople(data.people); })
      .catch(() => {});
  }, []);

  if (people.length === 0) return null;

  return (
    <div
      style={{
        height: 70,
        overflowX: "auto",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      } as React.CSSProperties}
      className="no-scrollbar"
    >
      {people.map((person) => (
        <div
          key={person.handle}
          onClick={() => router.push(`/u/${person.handle}`)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", flexShrink: 0 }}
        >
          <div style={{ position: "relative" }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: person.avatarUrl
                ? `url(${person.avatarUrl}) center/cover`
                : "linear-gradient(135deg, #1a1a2e, #16213e)",
              border: "2px solid #ffffff",
            }} />
            {person.isLive && (
              <div style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ff2d55",
                border: "1.5px solid #050814",
                animation: "livePulse 1.5s ease-in-out infinite",
              }} />
            )}
          </div>
          <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.7)", letterSpacing: "0.5px" }}>
            @{person.handle}
          </span>
        </div>
      ))}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

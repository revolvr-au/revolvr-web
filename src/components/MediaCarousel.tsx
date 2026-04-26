"use client";

import { useState, useRef } from "react";

type MediaItem = { type: string; url: string; order: number };

export default function MediaCarousel({ media, onTap }: { media: MediaItem[]; onTap: () => void }) {
  const [index, setIndex] = useState(0);
  const startXRef = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const diff = startXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 40) {
      onTap();
      return;
    }
    if (diff > 40 && index < media.length - 1) setIndex(index + 1);
    if (diff < -40 && index > 0) setIndex(index - 1);
    startXRef.current = null;
  };

  const current = media[index];

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={onTap}
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    >
      <img
        src={current.url ?? ""}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center",
        }}
      />

      {media.length > 1 && (
        <div style={{
          position: "absolute", top: 14, left: 0, right: 0,
          display: "flex", justifyContent: "center", gap: 5, zIndex: 5,
        }}>
          {media.map((_, i) => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: i === index ? "#fff" : "rgba(255,255,255,0.4)",
              transition: "background 0.2s",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

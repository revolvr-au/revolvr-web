"use client";

import React, { useRef, useState } from "react";

export type MediaItem = {
  type: "image" | "video";
  url: string;
  posterUrl?: string;
};

export function MediaCarousel({
  media,
  className = "",
}: {
  media: MediaItem[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const count = media?.length ?? 0;
  if (!count) return null;

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const nextIndex = Math.round(el.scrollLeft / el.clientWidth);
    if (nextIndex !== index) setIndex(nextIndex);
  };

  const scrollTo = (i: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setIndex(i);
  };

  return (
    <div className={className}>
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="relative flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl scrollbar-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {media.map((m, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-center">
            {m.type === "video" ? (
              <video
                src={m.url}
                poster={m.posterUrl}
                controls
                playsInline
                className="w-full max-h-[480px] object-cover"
              />
            ) : (
              <img
                src={m.url}
                alt=""
                className="w-full max-h-[480px] object-cover"
                draggable={false}
              />
            )}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {media.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Go to media ${i + 1}`}
              className={[
                "h-2 w-2 rounded-full transition",
                i === index ? "bg-white/85" : "bg-white/25 hover:bg-white/40",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

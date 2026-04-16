"use client";

import { useState } from "react";

type Props = {
  username: string;
  caption: string;
};

export default function PostCaption({ username, caption }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute bottom-24 left-4 right-28 z-20">
      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

      <div
        className="relative z-10 text-white cursor-pointer max-w-[70%]"
        onClick={() => setExpanded(!expanded)}
      >
        
        {/* Username */}
        <p className="text-sm font-semibold tracking-wide">
          @{username}
        </p>

        {/* Caption */}
        <p
          className={`text-sm leading-relaxed text-white/90 transition-all duration-200 ${
            expanded ? "" : "line-clamp-2"
          }`}
          style={
            !expanded
              ? {
                  WebkitMaskImage:
                    "linear-gradient(to bottom, black 60%, transparent 100%)",
                }
              : {}
          }
        >
          {caption}
        </p>

      </div>
    </div>
  );
}

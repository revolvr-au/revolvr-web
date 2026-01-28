"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  className?: string;
  onError?: () => void;
  heightClassName?: string; // e.g. "h-[320px] sm:h-[420px]"
};

export default function FeedVideo({
  src,
  className,
  onError,
  heightClassName = "h-[320px] sm:h-[420px]",
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isNearViewport, setIsNearViewport] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);

  // Observe visibility (near viewport)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        setIsNearViewport(Boolean(entries[0]?.isIntersecting));
      },
      {
        root: null,
        rootMargin: "400px 0px 400px 0px",
        threshold: 0.01,
      }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Load/unload based on viewport
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // handlers need stable references so we can remove them
    const handleLoadedMetadata = () => {
      // Force decode of first frame (iOS often shows black until you seek)
      try {
        if (v.duration && v.duration > 0) {
          v.currentTime = Math.min(0.01, v.duration / 2);
        } else {
          v.currentTime = 0.01;
        }
      } catch {
        // ignore
      }
    };

    const handleSeeked = () => {
      setHasFrame(true);
      try {
        v.pause();
      } catch {}
    };

    const handleError = () => {
      onError?.();
    };

    if (!isNearViewport) {
      // leaving viewport: pause + unload to reduce decoder pressure
      try {
        v.pause();
      } catch {}

      v.removeEventListener("loadedmetadata", handleLoadedMetadata);
      v.removeEventListener("seeked", handleSeeked);
      v.removeEventListener("error", handleError);

      v.removeAttribute("src");
      v.load();
      setHasFrame(false);
      return;
    }

    // entering viewport: set src only if changed, then load
    v.addEventListener("loadedmetadata", handleLoadedMetadata);
    v.addEventListener("seeked", handleSeeked);
    v.addEventListener("error", handleError);

    if (v.src !== src) {
      v.src = src;
    }

    // metadata is needed for the seek trick
    v.preload = "metadata";
    v.load();

    return () => {
      v.removeEventListener("loadedmetadata", handleLoadedMetadata);
      v.removeEventListener("seeked", handleSeeked);
      v.removeEventListener("error", handleError);
    };
  }, [isNearViewport, src, onError]);

  return (
    <div ref={wrapRef} className="relative w-full">
      {!hasFrame ? (
        <div
          className={[
            "w-full",
            heightClassName,
            "bg-white/5 border-t border-white/10",
            "flex items-center justify-center",
          ].join(" ")}
        >
          <span className="text-xs text-white/50">Loading video…</span>
        </div>
      ) : null}

      <video
        ref={videoRef}
        controls
        playsInline
        muted
        preload="metadata"
        className={[
          "w-full max-h-[520px] object-cover",
          hasFrame ? "" : "hidden",
          className ?? "",
        ].join(" ")}
      />
    </div>
  );
}

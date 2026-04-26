"use client";

import { useEffect, useRef, useState, useCallback, type RefObject } from "react";

// Global sound unlock — one tap anywhere unlocks audio for the session
let globalUnlocked = false;
const unlockListeners: (() => void)[] = [];
function subscribeUnlock(fn: () => void) {
  unlockListeners.push(fn);
  return () => {
    const i = unlockListeners.indexOf(fn);
    if (i > -1) unlockListeners.splice(i, 1);
  };
}
function triggerUnlock() {
  if (globalUnlocked) return;
  globalUnlocked = true;
  unlockListeners.forEach((fn) => fn());
}

const MAX_LOOPS = 4;

type Props = {
  playbackId: string;
  isActive: boolean;
  onTap?: () => void;
  scrollContainerRef?: RefObject<HTMLDivElement>;
};

export default function VideoPlayer({ playbackId, isActive, onTap, scrollContainerRef }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const loopCountRef = useRef(0);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(false);
  const [unlocked, setUnlocked] = useState(globalUnlocked);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPauseBars, setShowPauseBars] = useState(false);
  const pauseBarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Load HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const src = `https://stream.mux.com/${playbackId}.m3u8`;

    async function initHls() {
      const Hls = (await import("hls.js")).default;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      }
    }

    initHls();

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [playbackId]);

  // Play/pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      loopCountRef.current = 0;
      setFinished(false);
      setPaused(false);
      video.currentTime = 0;
      video.muted = !globalUnlocked;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  // Sound unlock subscription
  useEffect(() => {
    const unsub = subscribeUnlock(() => {
      setUnlocked(true);
      if (videoRef.current && isActive) {
        videoRef.current.muted = false;
      }
    });
    return unsub;
  }, [isActive]);

  // Progress tracking + loop counter
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (!isDraggingRef.current) setProgress(video.currentTime);
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onEnded = () => {
      loopCountRef.current += 1;
      if (loopCountRef.current >= MAX_LOOPS) {
        setFinished(true);
        setPaused(true);
      } else {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  const handleTap = useCallback(() => {
    if (!globalUnlocked) {
      triggerUnlock();
      if (videoRef.current) videoRef.current.muted = false;
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (finished) {
      loopCountRef.current = 0;
      setFinished(false);
      setPaused(false);
      video.currentTime = 0;
      video.play().catch(() => {});
      return;
    }

    if (video.paused) {
      video.play().catch(() => {});
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
      setShowPauseBars(true);
      if (pauseBarTimerRef.current) clearTimeout(pauseBarTimerRef.current);
      pauseBarTimerRef.current = setTimeout(() => setShowPauseBars(false), 400);
    }

    onTap?.();
  }, [finished, onTap]);

  // Scrubber
  const scrub = useCallback((clientX: number) => {
    const track = scrubRef.current;
    const video = videoRef.current;
    if (!track || !video || !duration) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = pct * duration;
    setProgress(pct * duration);
  }, [duration]);

  const onScrubStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    videoRef.current?.pause();
    scrub(e.clientX);
  }, [scrub]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      scrub(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      scrub(e.touches[0].clientX);
    };
    const onUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (scrollContainerRef?.current) {
        scrollContainerRef.current.style.overflowY = "auto";
        scrollContainerRef.current.style.scrollSnapType = "y mandatory";
      }
      if (!paused && !finished) videoRef.current?.play().catch(() => {});
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [scrub, paused, finished, scrollContainerRef]);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div
      onClick={handleTap}
      style={{ position: "absolute", inset: 0, zIndex: 0, cursor: "pointer" }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Pause bars */}
      {showPauseBars && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none", zIndex: 10,
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1].map((i) => (
              <div key={i} style={{
                width: 4, height: 26,
                background: "rgba(255,255,255,0.85)",
                borderRadius: 2,
                animation: "revolvr-fade-out 0.4s ease forwards",
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Tap for sound hint */}
      {!unlocked && isActive && (
        <div style={{
          position: "absolute", top: 14, right: 14,
          background: "rgba(0,0,0,0.45)",
          color: "rgba(255,255,255,0.75)",
          fontSize: 11, padding: "4px 10px", borderRadius: 20,
          pointerEvents: "none", zIndex: 10,
          animation: "revolvr-hint-fade 2.5s ease forwards",
        }}>
          tap for sound
        </div>
      )}

      {/* Watch again overlay */}
      {finished && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 8, pointerEvents: "none",
        }}>
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, letterSpacing: "0.04em" }}>
            tap to watch again
          </span>
        </div>
      )}

      {/* Scrubber */}
      <div
        style={{
          position: "absolute", bottom: 96, left: 16, right: 80,
          zIndex: 25, pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={scrubRef}
          onMouseDown={onScrubStart}
          onTouchStart={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (scrollContainerRef?.current) {
              scrollContainerRef.current.style.overflowY = "hidden";
              scrollContainerRef.current.style.scrollSnapType = "none";
            }
            isDraggingRef.current = true;
            videoRef.current?.pause();
            scrub(e.touches[0].clientX);
          }}
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            touchAction: "none",
          }}
        >
          <div style={{
            width: "100%", height: 2,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 1, position: "relative",
          }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: "rgba(255,255,255,0.85)",
              borderRadius: 1, position: "relative",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#fff", position: "absolute",
                right: -4, top: -3,
              }} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes revolvr-fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes revolvr-hint-fade {
          0% { opacity: 0; }
          20% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
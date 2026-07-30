"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

export default function GoLivePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // This page is preview + setup only. /live/[streamId] is the sole owner of the
  // IVS broadcast — starting one here too put two ingests on one stream key.
  useEffect(() => {
    let active = true;
    let drawInterval: ReturnType<typeof setInterval> | null = null;
    let visibilityHandler: (() => void) | null = null;
    let previewVideoEl: HTMLVideoElement | null = null;
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 480 }, height: { ideal: 854 }, aspectRatio: { ideal: 9/16 }, frameRate: { ideal: 30, max: 30 }, focusMode: 'continuous', exposureMode: 'continuous', whiteBalanceMode: 'continuous' } as MediaTrackConstraints,
          audio: true,
        });

        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        // Draw camera to canvas — preview only; nothing here feeds an ingest
        if (canvasRef.current && streamRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          const videoEl = document.createElement('video');
          videoEl.srcObject = streamRef.current;
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          videoEl.muted = true;
          await new Promise<void>((resolve) => {
            if (videoEl.readyState >= 1) { resolve(); return; }
            videoEl.addEventListener('loadedmetadata', () => resolve(), { once: true });
          });
          await videoEl.play();
          const draw = () => {
            if (ctx && videoEl.readyState >= 2) {
              const vw = videoEl.videoWidth;
              const vh = videoEl.videoHeight;
              const scale = Math.max(canvas.width / vw, canvas.height / vh) * 0.85;
              const x = (canvas.width - vw * scale) / 2;
              const y = (canvas.height - vh * scale) / 2;
              ctx.fillStyle = '#000';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(videoEl, x, y, vw * scale, vh * scale);
            }
          };
          draw();
          drawInterval = setInterval(draw, 33);
          visibilityHandler = () => {
            if (document.visibilityState === "visible") draw();
          };
          document.addEventListener("visibilitychange", visibilityHandler);
          previewVideoEl = videoEl;
        }

        setCameraReady(true);
        setError(null);
      } catch (err: any) {
        console.error('Camera init error:', err);
        setError("Camera access denied.");
        setCameraReady(false);
      }
    };

    init();

    // Unconditional teardown. The old `if (!broadcastingRef.current)` guard held the
    // camera open forever once the user tapped GO LIVE, so the phone was still
    // capturing here while /live/[streamId] opened its own capture.
    return () => {
      active = false;
      if (drawInterval) clearInterval(drawInterval);
      if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
      if (previewVideoEl) {
        try { previewVideoEl.pause(); previewVideoEl.srcObject = null; } catch {}
        previewVideoEl = null;
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [facingMode]);

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(p => !p);
  };

  const handleGoLive = async () => {
    if (!cameraReady) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      for (let i = 2; i >= 1; i--) {
        setCountdown(i);
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown(null);

      const res = await fetch("/api/live/create-ivs", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create stream");
      const { streamId, playbackUrl, ingestEndpoint } = data;

      // Hand the channel off to /live/[streamId], which starts the only broadcast.
      router.push(`/live/${streamId}?ivs=1&creator=1&key=${encodeURIComponent(data.streamKey)}&playback=${encodeURIComponent(playbackUrl ?? '')}&ingest=${encodeURIComponent(ingestEndpoint ?? '')}`);

    } catch (err: any) {
      console.error('Go live error:', err);
      setError(err.message ?? "Something went wrong");
      setCountdown(null);
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={854}
        style={{
          position: "absolute", top: 0, left: 0,
          width: "100%", height: "100%",
        }}
      />

      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "20%",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "56px 20px 20px",
      }}>
        <button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); router.back(); }} style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>‹</button>
        <div style={{ fontFamily: "monospace", fontSize: 13, letterSpacing: "4px", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>REVOLVR</div>
        <button onClick={toggleMute} style={{
          width: 40, height: 40, borderRadius: "50%",
          background: muted ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.5)",
          border: `1px solid ${muted ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}`,
          color: muted ? "#ffffff" : "#fff", fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{muted ? "🔇" : "🎙️"}</button>
      </div>

      <button onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")} style={{
        position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
        width: 44, height: 44, borderRadius: "50%",
        background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
        color: "#fff", fontSize: 20, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
      }}>↺</button>

      {countdown !== null && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontSize: 120, fontWeight: 800, color: "#fff", fontFamily: "monospace", textShadow: "0 0 40px rgba(255,255,255,0.8)" }}>{countdown}</div>
        </div>
      )}

      {error && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: 12, padding: "16px 24px", color: "#fff",
          fontSize: 13, textAlign: "center", maxWidth: 300, zIndex: 10,
        }}>{error}</div>
      )}

      {!cameraReady && !error && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace", fontSize: 13, letterSpacing: "2px" }}>
            LOADING CAMERA…
          </div>
        </div>
      )}

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 24px 56px", zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      }}>
        {!loading && cameraReady && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, fontFamily: "monospace", letterSpacing: "2px",
            color: "rgba(255,255,255,0.6)", textTransform: "uppercase",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#ffffff", boxShadow: "0 0 8px #ffffff",
              animation: "livePulse 2s ease-in-out infinite",
            }} />
            Camera ready
          </div>
        )}
        <button onClick={handleGoLive} disabled={loading || !cameraReady || countdown !== null} style={{
          width: "100%", maxWidth: 380, height: 60, borderRadius: 30, border: "none",
          background: loading || !cameraReady ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #E5004C 0%, #ff1a6b 100%)",
          color: "#fff", fontSize: 16, fontWeight: 700,
          fontFamily: "monospace", letterSpacing: "3px",
          cursor: loading || !cameraReady ? "default" : "pointer",
          textTransform: "uppercase",
          boxShadow: loading || !cameraReady ? "none" : "0 0 30px rgba(229,0,76,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          {loading ? <span style={{ opacity: 0.7 }}>Starting…</span> : (
            <><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.8)" }} />GO LIVE</>
          )}
        </button>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

export default function GoLivePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
      setError(null);
    } catch {
      setError("Camera access denied. Please allow camera access to go live.");
      setCameraReady(false);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode, startCamera]);

  const flipCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      setMuted(prev => !prev);
    }
  };

  const handleGoLive = async () => {
  setLoading(true);
  setError(null);

  try {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Countdown
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(null);

    // Create stream
    const res = await fetch("/api/live/create", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        router.push(`/live/${data.streamId}`);
        return;
      }
      throw new Error(data.error ?? "Failed to create stream");
    }

    const { streamKey, streamId } = data;

    // Connect to broadcast server via WebSocket
    const wsUrl = `${process.env.NEXT_PUBLIC_BROADCAST_URL}?key=${streamKey}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Start MediaRecorder and stream to WebSocket
      // Pick best supported codec
const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
  ? 'video/webm;codecs=vp8,opus'
  : MediaRecorder.isTypeSupported('video/webm')
  ? 'video/webm'
  : 'video/mp4';

const mediaRecorder = new MediaRecorder(streamRef.current!, {
  mimeType,
  videoBitsPerSecond: 1500000,
});

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      mediaRecorder.start(250); // Send chunks every 250ms

      // Store refs for cleanup
      (window as any)._mediaRecorder = mediaRecorder;
      (window as any)._broadcastWs = ws;
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('Broadcast connection failed');
    };

    // Navigate to live page
    router.push(`/live/${streamId}`);

  } catch (err: any) {
    setError(err.message ?? "Something went wrong");
    setCountdown(null);
    setLoading(false);
  }
};

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Camera preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: facingMode === "user" ? "scaleX(-1)" : "none",
        }}
      />

      {/* Dark gradient overlay — bottom */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "40%",
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Dark gradient overlay — top */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "20%",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Top controls */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "56px 20px 20px",
        zIndex: 10,
      }}>
        {/* Back */}
        <button
          onClick={() => {
            streamRef.current?.getTracks().forEach(t => t.stop());
            router.back();
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)",
          }}
        >
          ‹
        </button>

        {/* REVOLVR wordmark */}
        <div style={{
          fontFamily: "monospace",
          fontSize: 13,
          letterSpacing: "4px",
          color: "rgba(255,255,255,0.8)",
          fontWeight: 600,
        }}>
          REVOLVR
        </div>

        {/* Mute */}
        <button
          onClick={toggleMute}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: muted ? "rgba(0,229,255,0.2)" : "rgba(0,0,0,0.5)",
            border: `1px solid ${muted ? "rgba(0,229,255,0.5)" : "rgba(255,255,255,0.15)"}`,
            color: muted ? "#00e5ff" : "#fff",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)",
          }}
        >
          {muted ? "🔇" : "🎙️"}
        </button>
      </div>

      {/* Flip camera — right center */}
      <button
        onClick={flipCamera}
        style={{
          position: "absolute",
          right: 20,
          top: "50%",
          transform: "translateY(-50%)",
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff",
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(8px)",
          zIndex: 10,
        }}
      >
        ↺
      </button>

      {/* Countdown overlay */}
      {countdown !== null && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
          background: "rgba(0,0,0,0.3)",
        }}>
          <div style={{
            fontSize: 120,
            fontWeight: 800,
            color: "#fff",
            fontFamily: "monospace",
            textShadow: "0 0 40px rgba(0,229,255,0.8)",
            animation: "countPulse 0.9s ease-out",
          }}>
            {countdown}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: 12,
          padding: "16px 24px",
          color: "#fff",
          fontSize: 13,
          textAlign: "center",
          maxWidth: 280,
          zIndex: 10,
          backdropFilter: "blur(8px)",
        }}>
          {error}
        </div>
      )}

      {/* Bottom — GO LIVE button */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "0 24px 56px",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}>
        {/* Live indicator dot */}
        {!loading && cameraReady && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: "2px",
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#00e5ff",
              boxShadow: "0 0 8px #00e5ff",
              animation: "livePulse 2s ease-in-out infinite",
            }} />
            Camera ready
          </div>
        )}

        {/* GO LIVE button */}
        <button
          onClick={handleGoLive}
          disabled={loading || !cameraReady || countdown !== null}
          style={{
            width: "100%",
            maxWidth: 380,
            height: 60,
            borderRadius: 30,
            border: "none",
            background: loading || !cameraReady
              ? "rgba(255,255,255,0.1)"
              : "linear-gradient(135deg, #E5004C 0%, #ff1a6b 100%)",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "monospace",
            letterSpacing: "3px",
            cursor: loading || !cameraReady ? "default" : "pointer",
            textTransform: "uppercase",
            transition: "all 0.2s ease",
            boxShadow: loading || !cameraReady
              ? "none"
              : "0 0 30px rgba(229,0,76,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          {loading ? (
            <span style={{ opacity: 0.7 }}>Starting…</span>
          ) : (
            <>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 0 8px rgba(255,255,255,0.8)",
              }} />
              GO LIVE
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes countPulse {
          0% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
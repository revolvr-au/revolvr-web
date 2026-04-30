"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

export default function GoLivePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const broadcastClientRef = useRef<any>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [IVSClient, setIVSClient] = useState<any>(null);

  // Load IVS SDK
  useEffect(() => {
    import('amazon-ivs-web-broadcast').then((module) => {
      setIVSClient(() => module.default || module);
    });
  }, []);

  // Start camera preview
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
        setError(null);
      } catch {
        setError("Camera access denied. Please allow camera access to go live.");
        setCameraReady(false);
      }
    };

    startCamera();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode]);

  const toggleMute = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setMuted(prev => !prev);
    }
  };

  const handleGoLive = async () => {
    if (!IVSClient || !cameraReady) return;
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

      // Create stream record in REVOLVR
      const res = await fetch("/api/live/create-ivs", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create stream");

      const { streamId } = data;

      // Create IVS broadcast client
      const client = IVSClient.create({
        streamConfig: IVSClient.StreamConfig.BASIC_LANDSCAPE,
        ingestEndpoint: process.env.NEXT_PUBLIC_IVS_INGEST_ENDPOINT!,
      });

      broadcastClientRef.current = client;

      // Get camera stream
      const devices = await IVSClient.getMediaForDevices(
        { width: 1280, height: 720, facingMode },
        { echoCancellation: true }
      );

      await client.addVideoInputDevice(devices.video, 'camera1', { index: 0 });
      await client.addAudioInputDevice(devices.audio, 'mic1');

      // Attach preview
      const previewEl = client.attachPreview(videoRef.current!);

      // Start broadcasting
      await client.startBroadcast(process.env.NEXT_PUBLIC_IVS_STREAM_KEY!);

      // Navigate to live page
      router.push(`/live/${streamId}?ivs=1`);

    } catch (err: any) {
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
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover",
          transform: facingMode === "user" ? "scaleX(-1)" : "none",
        }}
      />

      {/* Top gradient */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "20%",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Bottom gradient */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Top controls */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "56px 20px 20px",
      }}>
        <button onClick={() => router.back()} style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(8px)",
        }}>‹</button>

        <div style={{
          fontFamily: "monospace", fontSize: 13,
          letterSpacing: "4px", color: "rgba(255,255,255,0.8)", fontWeight: 600,
        }}>REVOLVR</div>

        <button onClick={toggleMute} style={{
          width: 40, height: 40, borderRadius: "50%",
          background: muted ? "rgba(0,229,255,0.2)" : "rgba(0,0,0,0.5)",
          border: `1px solid ${muted ? "rgba(0,229,255,0.5)" : "rgba(255,255,255,0.15)"}`,
          color: muted ? "#00e5ff" : "#fff", fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(8px)",
        }}>{muted ? "🔇" : "🎙️"}</button>
      </div>

      {/* Flip camera */}
      <button onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")}
        style={{
          position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff", fontSize: 20, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(8px)", zIndex: 10,
        }}>↺</button>

      {/* Countdown */}
      {countdown !== null && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.3)",
        }}>
          <div style={{
            fontSize: 120, fontWeight: 800, color: "#fff",
            fontFamily: "monospace", textShadow: "0 0 40px rgba(0,229,255,0.8)",
          }}>{countdown}</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: 12, padding: "16px 24px", color: "#fff",
          fontSize: 13, textAlign: "center", maxWidth: 280, zIndex: 10,
          backdropFilter: "blur(8px)",
        }}>{error}</div>
      )}

      {/* Bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 24px 56px", zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      }}>
        {!loading && cameraReady && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, fontFamily: "monospace", letterSpacing: "2px",
            color: "rgba(255,255,255,0.5)", textTransform: "uppercase",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#00e5ff", boxShadow: "0 0 8px #00e5ff",
              animation: "livePulse 2s ease-in-out infinite",
            }} />
            Camera ready
          </div>
        )}

        <button onClick={handleGoLive}
          disabled={loading || !cameraReady || !IVSClient || countdown !== null}
          style={{
            width: "100%", maxWidth: 380, height: 60, borderRadius: 30,
            border: "none",
            background: loading || !cameraReady || !IVSClient
              ? "rgba(255,255,255,0.1)"
              : "linear-gradient(135deg, #E5004C 0%, #ff1a6b 100%)",
            color: "#fff", fontSize: 16, fontWeight: 700,
            fontFamily: "monospace", letterSpacing: "3px",
            cursor: loading || !cameraReady || !IVSClient ? "default" : "pointer",
            textTransform: "uppercase",
            boxShadow: loading || !cameraReady || !IVSClient
              ? "none" : "0 0 30px rgba(229,0,76,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
          {loading ? (
            <span style={{ opacity: 0.7 }}>Starting…</span>
          ) : !IVSClient ? (
            <span style={{ opacity: 0.7 }}>Loading…</span>
          ) : (
            <>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.8)",
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
      `}</style>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

export default function GoLivePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clientRef = useRef<any>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ivsClientRef = useRef<any>(null);

  // Init IVS client and camera on mount
  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const IVSBroadcastClient = (await import('amazon-ivs-web-broadcast')).default;
        ivsClientRef.current = IVSBroadcastClient;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const ingestEndpoint = (process.env.NEXT_PUBLIC_IVS_INGEST_ENDPOINT ?? '')
          .replace('rtmps://', '')
          .replace(':443/app/', '');

        const client = IVSBroadcastClient.create({
          streamConfig: IVSBroadcastClient.BASIC_PORTRAIT,
          ingestEndpoint,
        });
        clientRef.current = client;

        // Attach canvas for preview
        if (canvasRef.current) {
          client.attachPreview(canvasRef.current);
        }

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        if (videoTrack) {
          await client.addVideoInputDevice(
            new MediaStream([videoTrack]), 'camera1', { index: 0, width: 1280, height: 720 }
          );
        }
        if (audioTrack) {
          await client.addAudioInputDevice(new MediaStream([audioTrack]), 'mic1');
        }

        setCameraReady(true);
        setError(null);
      } catch (err: any) {
        setError("Camera access denied.");
        setCameraReady(false);
      }
    };

    init();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      try { clientRef.current?.delete(); } catch {}
    };
  }, [facingMode]);

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(p => !p);
  };

  const handleGoLive = async () => {
    if (!cameraReady || !clientRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      for (let i = 3; i >= 1; i--) {
        setCountdown(i);
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown(null);

      const res = await fetch("/api/live/create-ivs", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create stream");
      const { streamId } = data;

      await clientRef.current.startBroadcast(process.env.NEXT_PUBLIC_IVS_STREAM_KEY!);

      router.push(`/live/${streamId}?ivs=1&playback=${encodeURIComponent(process.env.NEXT_PUBLIC_IVS_PLAYBACK_URL ?? '')}`);

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
      {/* Canvas is the preview — IVS SDK renders into it */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          transform: "none",
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
        <button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); router.back(); }} style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>‹</button>
        <div style={{ fontFamily: "monospace", fontSize: 13, letterSpacing: "4px", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>REVOLVR</div>
        <button onClick={toggleMute} style={{
          width: 40, height: 40, borderRadius: "50%",
          background: muted ? "rgba(0,229,255,0.2)" : "rgba(0,0,0,0.5)",
          border: `1px solid ${muted ? "rgba(0,229,255,0.5)" : "rgba(255,255,255,0.15)"}`,
          color: muted ? "#00e5ff" : "#fff", fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{muted ? "🔇" : "🎙️"}</button>
      </div>

      {/* Flip camera */}
      <button onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")} style={{
        position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
        width: 44, height: 44, borderRadius: "50%",
        background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
        color: "#fff", fontSize: 20, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
      }}>↺</button>

      {/* Countdown */}
      {countdown !== null && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontSize: 120, fontWeight: 800, color: "#fff", fontFamily: "monospace", textShadow: "0 0 40px rgba(0,229,255,0.8)" }}>{countdown}</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: 12, padding: "16px 24px", color: "#fff",
          fontSize: 13, textAlign: "center", maxWidth: 300, zIndex: 10,
        }}>{error}</div>
      )}

      {/* Loading state */}
      {!cameraReady && !error && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace", fontSize: 13, letterSpacing: "2px" }}>
            LOADING CAMERA…
          </div>
        </div>
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

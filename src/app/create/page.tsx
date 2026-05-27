"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Zap } from "lucide-react";
import { resetFeedCache } from "@/app/public-feed/PublicFeedClient";

export default function CreatePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Core Application States
  const [mode, setMode] = useState<"UPLOAD" | "LIVE">("UPLOAD");
  const [isTranche, setIsTranche] = useState(false);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Pipeline Tracking States
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // 1. HARDWARE LIFECYCLE CONTROLLER
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function enableCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: true
        });
        activeStream = stream;
        setMediaStream(stream);
      } catch (err) {
        console.error("Camera hardware access denied:", err);
      }
    }

    // Only ignite camera if user hasn't snapped a file preview yet
    if (previews.length === 0) {
      enableCamera();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [previews.length]);

  // Bind stream context dynamically to viewport element
  useEffect(() => {
    if (videoRef.current && mediaStream && previews.length === 0) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(err => console.error("iOS Auto-render catch:", err));
    }
  }, [mediaStream, previews.length]);

  // 2. INSTANT RAW CANVAS SNAPSHOT INGESTION ENGINE
  const handleInstantCapture = () => {
    if (videoRef.current && mediaStream) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1080;
      canvas.height = video.videoHeight || 1920;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Correct composition mirroring for natural selfie layout snapshot
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

        // Direct structural conversion from base64 to clean binary byte data
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([ab], { type: mimeString });
        const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });

        setFiles([capturedFile]);
        setPreviews([dataUrl]);
        setActiveIndex(0);
        
        // Clean up running hardware instantly upon snapshot freezing
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
          setMediaStream(null);
        }
      }
    }
  };

  // 3. STORAGE & PRISMA DISPATCH DEPLOYMENT PIPELINE
  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    setStatusMsg("Initializing database record...");

    try {
      // Create initial platform placeholder shell
      const finalCaption = caption.trim() || "Transmission finalized via Autonomous Command";
      const initialRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: finalCaption,
          isTranche,
          userEmail: "revolvrassist@gmail.com"
        })
      });

      if (!initialRes.ok) throw new Error("Failed to secure core record reference.");
      const postData = await initialRes.json();

      // Safely pull the ID variable path regardless of flat or nested backend payload structures
      const targetPostId = postData.id || postData.post?.id || postData.data?.id;

      if (!targetPostId) {
        throw new Error("Unable to parse a valid record assignment ID from server response.");
      }

      if (files.length > 0) {
        setStatusMsg("Ingesting binary assets directly to storage...");
        const formData = new FormData();
        formData.append("file", files[0]);

        // Route to the validated target database identifier row cleanly
        const mediaRes = await fetch(`/api/posts/${targetPostId}/media`, {
          method: "POST",
          body: formData
        });

        if (!mediaRes.ok) throw new Error("Binary payload allocation handshake failed.");
      }

      setStatusMsg("Deployment complete.");
      resetFeedCache();
      router.push("/public-feed");
    } catch (err: any) {
      console.error("Pipeline failure:", err);
      setStatusMsg(`Handshake error: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100dvh", overflow: "hidden", background: "#000", fontFamily: "monospace" }}>
      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes scanner { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        @keyframes pulse-target { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 0.3; } }
      `}</style>

      {/* VIEWPORT GRAPHICS SYSTEM */}
      {previews.length === 0 ? (
        <>
          {/* CAMERA RUNTIME VISUALIZER */}
          <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "#000" }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
            {!mediaStream && mode === "LIVE" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 2 }}>
                [ AWS WEBRTC FEED OFFLINE ]
              </div>
            )}
          </div>

          {/* TELEMETRY HEADS-UP OVERLAYS */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
            <div style={{ position: "absolute", top: 140, left: 20, color: "#00e5ff", fontSize: 10, animation: "blink 1s infinite" }}>SYSTEM: ANALYZING TENSORS...</div>
            <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "rgba(0, 229, 255, 0.4)", boxShadow: "0 0 10px rgba(0, 229, 255, 0.7)", animation: "scanner 4s linear infinite" }} />
            <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 44, height: 44, border: "1px solid rgba(0,229,255,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse-target 2s infinite" }}>
                <div style={{ width: 6, height: 6, background: "#00e5ff", borderRadius: "50%" }} />
              </div>
              <div style={{ fontSize: 11, color: "#00e5ff", letterSpacing: 2, marginTop: 10, textShadow: "0 2px 4px rgba(0,0,0,0.9)" }}>[ SENSOR ARRAY ACTIVE ]</div>
            </div>
          </div>
        </>
      ) : (
        /* INSTANT POST-CAPTURE DISPLAY LAYER */
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "#000" }}>
          <img src={previews[0]} alt="Captured transmission snapshot" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      {/* SYSTEM CONTROLS CHROME (STACKED TRANSPARENTLY ABOVE VIEWPORTS) */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 160, background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)", zIndex: 10, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 380, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)", zIndex: 10, pointerEvents: "none" }} />

      {/* TOP NAVIGATION MANAGEMENT */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, display: "flex", flexDirection: "column", padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 0 }}>
            <ChevronLeft size={28} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }} />
          </button>
          <div style={{ fontSize: 12, letterSpacing: 2, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
            {previews.length === 0 ? "[ AUTONOMOUS COMMAND ]" : "[ ASSET DEPLOYMENT REVIEW ]"}
          </div>
          <div style={{ width: 28, display: "flex", justifyContent: "flex-end" }}>
            {previews.length > 0 && (
              <button onClick={() => { setFiles([]); setPreviews([]); setCaption(""); }} style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50%", width: 28, height: 28, color: "white", fontSize: 12, cursor: "pointer" }}>✕</button>
            )}
          </div>
        </div>

        {previews.length === 0 && (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setMode("UPLOAD")} style={{ flex: 1, padding: "10px", fontSize: 11, letterSpacing: 1, fontFamily: "inherit", cursor: "pointer", background: mode === "UPLOAD" ? "rgba(0,229,255,0.15)" : "rgba(0,0,0,0.5)", border: `1px solid ${mode === "UPLOAD" ? "#00e5ff" : "rgba(255,255,255,0.2)"}`, color: mode === "UPLOAD" ? "#00e5ff" : "rgba(255,255,255,0.6)", borderRadius: 8, backdropFilter: "blur(8px)", transition: "all 0.2s" }}>[ SECURE UPLOAD ]</button>
            <button onClick={() => setMode("LIVE")} style={{ flex: 1, padding: "10px", fontSize: 11, letterSpacing: 1, fontFamily: "inherit", cursor: "pointer", background: mode === "LIVE" ? "rgba(255,45,85,0.15)" : "rgba(0,0,0,0.5)", border: `1px solid ${mode === "LIVE" ? "#ff2d55" : "rgba(255,255,255,0.2)"}`, color: mode === "LIVE" ? "#ff2d55" : "rgba(255,255,255,0.6)", borderRadius: 8, backdropFilter: "blur(8px)", transition: "all 0.2s" }}>[ GO LIVE ]</button>
          </div>
        )}
      </div>

      {/* BOTTOM CONSOLE OVERLAYS */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, display: "flex", flexDirection: "column", padding: "20px 20px calc(20px + env(safe-area-inset-bottom))" }}>
        
        {/* HUD TELEMETRY DATA FORM BLOCK */}
        <div style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(0, 229, 255, 0.15)", borderRadius: 12, padding: "12px", display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 10, color: "rgba(0, 229, 255, 0.7)", marginBottom: 6 }}>[ TRANSMISSION METADATA ]</span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={previews.length === 0 ? "[ Awaiting automated matrix snapshot... ]" : "Type caption overrides..."}
              rows={2}
              style={{ width: "100%", color: "white", caretColor: "#00e5ff", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px", outline: "none", resize: "none", fontSize: "16px", fontFamily: "inherit" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(0,229,255,0.6)" }}>
            <span>CLUSTER: <span style={{ color: "#fff" }}>[ AUTO_DETECTION ]</span></span>
            <span>VOLTAGE: <span style={{ color: "#fff" }}>[ READY ]</span></span>
          </div>
          <div onClick={() => setIsTranche(!isTranche)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", border: `1px solid ${isTranche ? "#F5C518" : "rgba(255,255,255,0.1)"}`, background: isTranche ? "rgba(245,197,24,0.15)" : "rgba(255,255,255,0.02)", borderRadius: 6, padding: "8px 12px", transition: "all 0.15s" }}>
            <Zap size={14} color={isTranche ? "#F5C518" : "rgba(255,255,255,0.4)"} />
            <span style={{ fontSize: 11, color: isTranche ? "#F5C518" : "rgba(255,255,255,0.5)" }}>[ NEURAL TRANCHE IGNITION ]</span>
          </div>
        </div>

        {/* UNIVERSAL CONCENTRIC SHUTTER TRIGGER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80 }}>
          <button
            onClick={previews.length === 0 ? (mode === "UPLOAD" ? handleInstantCapture : handleSubmit) : handleSubmit}
            disabled={loading}
            style={{ width: 76, height: 76, borderRadius: "50%", border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", cursor: loading ? "not-allowed" : "pointer", padding: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}
          >
            <div style={{ 
              width: 56, height: 56, borderRadius: "50%", 
              background: previews.length > 0 ? "#F5C518" : (mode === "LIVE" ? "#ff2d55" : "#00e5ff"),
              boxShadow: `0 0 20px ${previews.length > 0 ? "#F5C518" : (mode === "LIVE" ? "#ff2d55" : "#00e5ff")}`,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              {loading ? (
                <div style={{ fontSize: 10, color: "#fff", fontWeight: "bold" }}>...</div>
              ) : previews.length > 0 ? (
                <div style={{ fontSize: 11, color: "#000", fontWeight: "bold", letterSpacing: 1 }}>DEPL</div>
              ) : null}
            </div>
          </button>
        </div>

        {loading && statusMsg && (
          <div style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 10, letterSpacing: 1 }}>
            {statusMsg.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
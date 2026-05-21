"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Zap } from "lucide-react";
import { createSupabaseBrowserClient } from "@/supabase-browser";

export default function CreatePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<"UPLOAD" | "LIVE">("UPLOAD");
  const [isTranche, setIsTranche] = useState(false);
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function enableCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user" }, 
          audio: true 
        });
        activeStream = stream;
        setMediaStream(stream);
      } catch (err) {
        console.error("Camera access denied", err);
      }
    }
    enableCamera();

    return () => {
      // Cleanup: kill the camera light when unmounting
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
      // Force iOS Safari to kick-start the stream rendering
      videoRef.current.play().catch(err => console.error("iOS Video playback failed:", err));
    }
  }, [mediaStream, mode, previews.length]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const handleFiles = (selected: FileList) => {
    const arr = Array.from(selected).slice(0, 10);
    setFiles(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
    setActiveIndex(0);
    setUploadProgress(0);
    setStatusMsg("");
  };

  const uploadImageToSupabase = async (f: File): Promise<string> => {
    const supabase = createSupabaseBrowserClient();
    const ext = f.name.split(".").pop() ?? "bin";
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("posts")
      .upload(path, f, { contentType: f.type, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("posts").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadVideoToMux = async (f: File): Promise<{ playbackId: string }> => {
    setStatusMsg("Preparing upload...");

    const initRes = await fetch("/api/video/upload", { method: "POST" });
    if (!initRes.ok) throw new Error("Failed to get upload URL");
    const { uploadURL, uploadId } = await initRes.json();

    setStatusMsg("Uploading video...");

    const uploadRes = await fetch(uploadURL, {
      method: "PUT",
      body: f,
      headers: { "Content-Type": f.type },
    });

    if (!uploadRes.ok) throw new Error("Upload failed");

    setStatusMsg("Processing video...");
    setUploadProgress(100);

    for (let i = 0; i < 60; i++) {
      const statusRes = await fetch(`/api/video/status/${uploadId}`);
      const status = await statusRes.json();
      if (status.ready && status.playbackId) {
        return { playbackId: status.playbackId };
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error("Video processing timed out.");
  };

  const handleSubmit = async () => {
    if (!files.length || !userEmail) return;
    setLoading(true);

    try {
      // 1. Create the post shell
      setStatusMsg("Creating post...");
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, userEmail }),
      });
      if (!postRes.ok) {
        const e = await postRes.json().catch(() => ({}));
        throw new Error(e.error ?? "Post creation failed");
      }
      const { post } = await postRes.json();

      // 2. Upload all files in parallel
      setStatusMsg(`Uploading ${files.length} file${files.length > 1 ? "s" : ""}...`);
      const media = await Promise.all(
        files.map(async (f, i) => {
          const isVid = f.type.startsWith("video/");
          if (isVid) {
            const { playbackId } = await uploadVideoToMux(f);
            return { type: "VIDEO" as const, url: playbackId, order: i };
          } else {
            const url = await uploadImageToSupabase(f);
            return { type: "IMAGE" as const, url, order: i };
          }
        })
      );

      // 3. Attach media to the post
      setStatusMsg("Saving...");
      const mediaRes = await fetch(`/api/posts/${post.id}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media }),
      });
      if (!mediaRes.ok) {
        const e = await mediaRes.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to save media");
      }

      router.push("/public-feed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something failed";
      alert(msg);
      setStatusMsg("");
    }

    setLoading(false);
  };

  const loadingLabel = () => {
    if (!loading) return "Post";
    return statusMsg || "Posting...";
  };

  return (
    <div style={{
      position: "relative",
      width: "100vw",
      height: "100dvh",
      background: "#000",
      color: "white",
      overflow: "hidden",
      fontFamily: "monospace",
    }}>
      <style>{`
        @keyframes pulse-target {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 0.3; }
        }
        @keyframes scanner {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      {/* 1. BACKGROUND VIDEO / MEDIA LAYER */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {previews.length > 0 && mode === "UPLOAD" ? (
          <>
            {files[activeIndex]?.type.startsWith("video/") ? (
              <video src={previews[activeIndex]} autoPlay muted loop playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <img src={previews[activeIndex]} alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "#000" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
            />
            {!mediaStream && mode === "LIVE" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textAlign: "center", zIndex: 1 }}>[ AWS WEBRTC FEED OFFLINE ]</div>
            )}
          </div>
        )}

        {/* SENSOR / SCANNING OVERLAYS (Only when no preview) */}
        {previews.length === 0 && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
            <div style={{
              position: "absolute", top: 140, left: 20, color: "#00e5ff", fontSize: 10, fontFamily: "monospace", animation: "blink 1s infinite"
            }}>SYSTEM: ANALYZING TENSORS...</div>
            <div style={{
              position: "absolute", left: 0, right: 0, height: 2, background: "rgba(0, 229, 255, 0.5)", boxShadow: "0 0 10px rgba(0, 229, 255, 0.8)", animation: "scanner 3s linear infinite"
            }} />
            <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 48, height: 48, border: "1px solid rgba(0,229,255,0.4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse-target 2s infinite" }}>
                <div style={{ width: 6, height: 6, background: "#00e5ff", borderRadius: "50%" }} />
              </div>
              <div style={{ fontSize: 12, color: "#00e5ff", letterSpacing: 2, marginTop: 8, textShadow: "0 0 4px rgba(0,0,0,0.8)" }}>
                [ SENSOR ARRAY ACTIVE ]
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. LEGIBILITY SHROUDS */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 160, background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)", zIndex: 5, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 450, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)", zIndex: 5, pointerEvents: "none" }} />

      {/* 3. FLOATING TOP CHROME */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, display: "flex", flexDirection: "column" }}>
        {/* Top Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 0 }}>
            <ChevronLeft size={28} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }} />
          </button>
          <div style={{ fontSize: 12, letterSpacing: 2, color: "rgba(255,255,255,0.95)", textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}>
            [ AUTONOMOUS COMMAND ]
          </div>
          <div style={{ width: 28, display: "flex", justifyContent: "flex-end" }}>
            {previews.length > 0 && (
              <button
                onClick={() => { setFiles([]); setPreviews([]); setActiveIndex(0); }}
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50%", width: 28, height: 28, color: "white", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
              >✕</button>
            )}
          </div>
        </div>

        {/* Mode Switcher */}
        <div style={{ display: "flex", gap: 10, padding: "0 20px" }}>
          <button onClick={() => setMode("UPLOAD")} style={{
            flex: 1, padding: "10px", fontSize: 11, letterSpacing: 1, fontFamily: "inherit", cursor: "pointer",
            background: mode === "UPLOAD" ? "rgba(0,229,255,0.2)" : "rgba(0,0,0,0.4)",
            border: `1px solid ${mode === "UPLOAD" ? "#00e5ff" : "rgba(255,255,255,0.3)"}`,
            color: mode === "UPLOAD" ? "#00e5ff" : "rgba(255,255,255,0.8)",
            textShadow: mode === "UPLOAD" ? "0 0 8px rgba(0,229,255,0.6)" : "0 2px 4px rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)", borderRadius: 8, transition: "all 0.2s"
          }}>[ SECURE UPLOAD ]</button>
          <button onClick={() => setMode("LIVE")} style={{
            flex: 1, padding: "10px", fontSize: 11, letterSpacing: 1, fontFamily: "inherit", cursor: "pointer",
            background: mode === "LIVE" ? "rgba(255,45,85,0.2)" : "rgba(0,0,0,0.4)",
            border: `1px solid ${mode === "LIVE" ? "#ff2d55" : "rgba(255,255,255,0.3)"}`,
            color: mode === "LIVE" ? "#ff2d55" : "rgba(255,255,255,0.8)",
            textShadow: mode === "LIVE" ? "0 0 8px rgba(255,45,85,0.6)" : "0 2px 4px rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)", borderRadius: 8, transition: "all 0.2s"
          }}>[ GO LIVE ]</button>
        </div>
      </div>

      {/* 4. FLOATING METADATA TERMINAL & SHUTTER (BOTTOM) */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, display: "flex", flexDirection: "column", padding: "20px 20px calc(20px + env(safe-area-inset-bottom))" }}>
        
        {/* Multi-file Preview Indicators */}
        {previews.length > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12 }}>
            {previews.map((_, i) => (
              <div key={i} onClick={() => setActiveIndex(i)} style={{
                width: 6, height: 6, borderRadius: "50%", cursor: "pointer",
                background: i === activeIndex ? "#fff" : "rgba(255,255,255,0.4)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.8)"
              }} />
            ))}
          </div>
        )}

        {/* Upload Progress Bar */}
        {loading && uploadProgress > 0 && (
          <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.1)", marginBottom: 16, borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${uploadProgress}%`,
              background: "#00e5ff",
              transition: "width 0.3s ease",
            }} />
          </div>
        )}

        {/* Metadata HUD Terminal */}
        <div style={{
          background: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(0, 229, 255, 0.2)",
          borderRadius: 12,
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          fontSize: 11,
          color: "rgba(0, 229, 255, 0.8)",
          marginBottom: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
        }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ marginBottom: 6, opacity: 0.7 }}>[ GENERATED CAPTION ]</span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="[ Waiting for media... ]"
              rows={2}
              style={{
                width: "100%", color: "white", caretColor: "#00e5ff", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px",
                outline: "none", resize: "none", overflowY: "auto", fontSize: 12, fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>DETECTED CLUSTER: <span style={{ color: "#fff" }}>[ --- ]</span></span>
            <span>VOLTAGE: <span style={{ color: "#fff" }}>[ CALC ]</span></span>
          </div>
          <div onClick={() => setIsTranche(!isTranche)} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
            border: `1px solid ${isTranche ? "#F5C518" : "rgba(255,255,255,0.1)"}`,
            background: isTranche ? "rgba(245,197,24,0.15)" : "rgba(255,255,255,0.05)",
            borderRadius: 6, padding: "8px 12px", transition: "all 0.2s"
          }}>
            <Zap size={14} color={isTranche ? "#F5C518" : "rgba(255,255,255,0.4)"} />
            <div style={{ color: isTranche ? "#F5C518" : "rgba(255,255,255,0.5)", letterSpacing: 1, fontWeight: isTranche ? "bold" : "normal" }}>
              [ NEURAL TRANCHE IGNITION ]
            </div>
          </div>
        </div>

        {/* TikTok-Style Shutter Button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", height: 76 }}>
          {mode === "UPLOAD" && previews.length === 0 ? (
            <label style={{
              width: 76, height: 76, borderRadius: "50%", border: "4px solid #fff",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#00e5ff",
                boxShadow: "0 0 20px #00e5ff"
              }} />
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) handleFiles(e.target.files);
                }}
              />
            </label>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || (mode === "UPLOAD" && !files.length)}
              style={{
                width: 76, height: 76, borderRadius: "50%", border: "4px solid #fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", cursor: loading ? "not-allowed" : "pointer", padding: 0,
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                opacity: (loading || (mode === "UPLOAD" && !files.length)) ? 0.5 : 1
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: mode === "LIVE" ? "#ff2d55" : "#00e5ff",
                boxShadow: `0 0 20px ${mode === "LIVE" ? "#ff2d55" : "#00e5ff"}`,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {loading && <div style={{ fontSize: 10, color: "#fff", fontWeight: "bold" }}>...</div>}
              </div>
            </button>
          )}

          {/* Status Label */}
          {loading && statusMsg && (
            <div style={{ position: "absolute", bottom: -24, fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: 1 }}>
              {statusMsg.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

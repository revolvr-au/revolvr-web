"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

export default function CreatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const handleFile = (f: File) => {
    setFile(f);
    setIsVideo(f.type.startsWith("video/"));
    setPreview(URL.createObjectURL(f));
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

  const uploadVideoToCloudflare = async (f: File): Promise<{ videoId: string; thumbnailUrl: string | null }> => {
    setStatusMsg("Preparing upload...");
    const initRes = await fetch("/api/video/upload", { method: "POST" });
    if (!initRes.ok) throw new Error("Failed to get upload URL");
    const { uploadURL, videoId } = await initRes.json();

    setStatusMsg("Uploading video...");
    const uploadResponse = await fetch(uploadURL, {
      method: "PUT",
      body: f,
      headers: {
        "Content-Type": f.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    setStatusMsg("Processing video...");
    setUploadProgress(100);

    for (let i = 0; i < 30; i++) {
      const statusRes = await fetch(`/api/video/status/${videoId}`);
      const status = await statusRes.json();
      if (status.ready) {
        return { videoId, thumbnailUrl: status.thumbnailUrl ?? null };
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Video processing timed out. Try again in a moment.");
  };

  const handleSubmit = async () => {
    if (!file || !userEmail) return;
    setLoading(true);
    setStatusMsg(isVideo ? "Preparing upload..." : "Uploading...");

    try {
      let postBody: Record<string, string | null>;

      if (isVideo) {
        const { videoId, thumbnailUrl } = await uploadVideoToCloudflare(file);
        postBody = {
          caption,
          userEmail,
          cloudflareVideoId: videoId,
          media_url: thumbnailUrl,
        };
      } else {
        const mediaUrl = await uploadImageToSupabase(file);
        postBody = { caption, userEmail, media_url: mediaUrl };
      }

      setStatusMsg("Creating post...");
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBody),
      });

      if (!postRes.ok) {
        const err = await postRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Post creation failed");
      }

      router.push("/public-feed");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Something failed";
      alert(msg);
      setStatusMsg("");
      setUploadProgress(0);
    }

    setLoading(false);
  };

  const loadingLabel = () => {
    if (!loading) return "Post";
    if (isVideo && uploadProgress > 0 && uploadProgress < 100) return `Uploading ${uploadProgress}%`;
    return statusMsg || "Posting...";
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0a0806",
      color: "white",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* TOP NAV */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer" }}
        >←</button>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 16,
          letterSpacing: 6,
          color: "white",
        }}>REVOLVR</div>
        <div style={{ width: 32 }} />
      </div>

      {/* PREVIEW */}
      <div style={{
        width: "100%",
        aspectRatio: "9/16",
        maxHeight: "60dvh",
        background: "rgba(255,255,255,0.03)",
        border: "1px dashed rgba(255,255,255,0.15)",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {!preview ? (
          <label style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            gap: 8,
          }}>
            <div style={{ fontSize: 36, opacity: 0.3 }}>+</div>
            <div style={{ fontSize: 13, opacity: 0.4, fontFamily: "monospace", letterSpacing: 2 }}>
              TAP TO UPLOAD
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
        ) : (
          <>
            {isVideo ? (
              <video
                src={preview}
                autoPlay
                muted
                loop
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <img
                src={preview}
                alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
            <button
              onClick={() => { setFile(null); setPreview(null); setIsVideo(false); setUploadProgress(0); setStatusMsg(""); }}
              style={{
                position: "absolute",
                top: 10, right: 10,
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                width: 30, height: 30,
                color: "white",
                fontSize: 14,
                cursor: "pointer",
              }}
            >✕</button>
          </>
        )}
      </div>

      {/* PROGRESS BAR */}
      {loading && isVideo && uploadProgress > 0 && (
        <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.1)" }}>
          <div style={{
            height: "100%",
            width: `${uploadProgress}%`,
            background: "white",
            transition: "width 0.3s ease",
          }} />
        </div>
      )}

      {/* CAPTION + POST */}
      <div style={{
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: "12px 16px",
        }}>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Say something about this..."
            rows={2}
            style={{
              width: "100%",
              minHeight: "44px",
              maxHeight: "100px",
              color: "white",
              caretColor: "white",
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              overflowY: "auto",
              fontSize: 16,
              lineHeight: 1.6,
              fontFamily: "inherit",
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 999,
            border: "none",
            background: !file ? "rgba(255,255,255,0.1)" : "white",
            color: !file ? "rgba(255,255,255,0.4)" : "black",
            fontWeight: 600,
            fontSize: 16,
            cursor: !file ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {loadingLabel()}
        </button>
      </div>
    </div>
  );
}

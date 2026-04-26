"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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
        {previews.length === 0 ? (
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
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files);
              }}
            />
          </label>
        ) : (
          <>
            {files[activeIndex]?.type.startsWith("video/") ? (
              <video src={previews[activeIndex]} autoPlay muted loop playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <img src={previews[activeIndex]} alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
            {previews.length > 1 && (
              <div style={{
                position: "absolute", bottom: 10, left: 0, right: 0,
                display: "flex", justifyContent: "center", gap: 5,
              }}>
                {previews.map((_, i) => (
                  <div key={i} onClick={() => setActiveIndex(i)} style={{
                    width: 6, height: 6, borderRadius: "50%", cursor: "pointer",
                    background: i === activeIndex ? "#fff" : "rgba(255,255,255,0.4)",
                  }} />
                ))}
              </div>
            )}
            <button
              onClick={() => { setFiles([]); setPreviews([]); setActiveIndex(0); }}
              style={{
                position: "absolute", top: 10, right: 10,
                background: "rgba(0,0,0,0.6)", border: "none",
                borderRadius: "50%", width: 30, height: 30,
                color: "white", fontSize: 14, cursor: "pointer",
              }}
            >✕</button>
          </>
        )}
      </div>

      {/* PROGRESS BAR */}
      {loading && uploadProgress > 0 && (
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
          disabled={!files.length || loading}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 999,
            border: "none",
            background: !files.length ? "rgba(255,255,255,0.1)" : "white",
            color: !files.length ? "rgba(255,255,255,0.4)" : "black",
            fontWeight: 600,
            fontSize: 16,
            cursor: !files.length ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {loadingLabel()}
        </button>
      </div>
    </div>
  );
}

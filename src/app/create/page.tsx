"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData?.url) {
        alert("Upload failed");
        setLoading(false);
        return;
      }

      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          media_url: uploadData.url,
          userEmail: "test@user.com",
        }),
      });

      if (!postRes.ok) {
        alert("Post creation failed");
        setLoading(false);
        return;
      }

      router.push("/public-feed");
    } catch (err) {
      console.error(err);
      alert("Something failed");
    }

    setLoading(false);
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

      {/* PREVIEW — matches feed 9:16 ratio */}
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
            <img
              src={preview}
              alt="preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <button
              onClick={() => { setFile(null); setPreview(null); }}
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
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}
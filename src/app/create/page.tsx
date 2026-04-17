"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 📁 Handle file select
  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const router = useRouter();

  // 📤 Upload
  const handleSubmit = async () => {
  if (!file) return;

  setLoading(true);

  try {
    // STEP 1: Upload file
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

    // STEP 2: Create post in DB
    const postRes = await fetch("/api/posts", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
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

// ✅ Option A (instant redirect)
router.push("/public-feed");

// OPTIONAL cleanup (safe to keep)
setFile(null);
setPreview(null);
setCaption("");

    // STEP 3: Reset UI
    setFile(null);
    setPreview(null);
    setCaption("");

  } catch (err) {
    console.error(err);
    alert("Something failed");
  }

  setLoading(false);
};

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "0 auto",
        padding: 16,
        color: "white",
      }}
    >
      <h2 style={{ marginBottom: 16 }}>Create</h2>

      {/* 📦 Upload Area */}
      <div
        style={{
          width: "100%",
          height: 300,
          borderRadius: 14,
          border: "1px dashed rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "rgba(255,255,255,0.03)",
          position: "relative",
          marginBottom: 16,
        }}
      >
        {!preview && (
          <label
            style={{
              cursor: "pointer",
              textAlign: "center",
              opacity: 0.7,
            }}
          >
            <div style={{ fontSize: 14 }}>Tap to upload</div>
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
        )}

        {/* 🖼 Preview */}
        {preview && (
          <>
            <img
              src={preview}
              alt="preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {/* ❌ Remove button */}
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                width: 28,
                height: 28,
                color: "white",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </>
        )}
      </div>

     {/* ✏️ Caption */}
<div style={{ padding: "12px 0" }}>
  <div style={{
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "12px 16px",
  }}>
    <textarea
      ref={textareaRef}
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
        fontSize: 14,
        lineHeight: 1.6,
        fontFamily: "inherit",
      }}
    />
  </div>
</div>

      {/* 🚀 Post Button */}
      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 999,
          border: "none",
          background: !file
            ? "rgba(255,255,255,0.1)"
            : "white",
          color: !file ? "rgba(255,255,255,0.4)" : "black",
          fontWeight: 600,
          cursor: !file ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
        }}
      >
        {loading ? "Posting..." : "Post"}
      </button>
    </div>
  );
}

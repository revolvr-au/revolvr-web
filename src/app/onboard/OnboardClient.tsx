"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

export default function OnboardClient() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleValid = handle.trim().length > 0 && /^[a-zA-Z0-9_]+$/.test(handle.trim());
  const canSubmit = handleValid && displayName.trim().length > 0 && !loading && !uploading;

  const onAvatarClick = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setUploading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not authenticated."); return; }
      const slug = handle.trim() || user.id;
      const path = `${slug}/avatar.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) { setError(uploadErr.message); return; }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(publicUrl);
      fetch("/api/avatar/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: publicUrl, email: user.email }),
      }).catch(console.error);
    } catch (e: any) {
      setError(e?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: handle.trim(),
          displayName: displayName.trim(),
          avatarUrl,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setError(json?.error || "Something went wrong."); return; }
      window.location.href = "/public-feed";
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const initial = displayName.trim()[0]?.toUpperCase() || "?";

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0a0806",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 8, color: "white", marginBottom: 32 }}>
        REVOLVR
      </div>

      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>

        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: "white", textAlign: "center", lineHeight: 1 }}>
          WELCOME TO REVOLVR
        </div>

        <div style={{ fontFamily: "monospace", fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
          Set up your profile to get started.
        </div>

        {/* Avatar */}
        <button
          type="button"
          onClick={onAvatarClick}
          style={{
            width: 100, height: 100, borderRadius: "50%",
            background: "#1a1510", border: "2px solid #2a2520",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", cursor: "pointer", flexShrink: 0,
          }}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: "rgba(255,255,255,0.6)" }}>
              {displayName.trim() ? initial : "+"}
            </span>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />

        {uploading && (
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>uploading…</div>
        )}

        {/* Handle */}
        <div style={{ width: "100%", position: "relative" }}>
          <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", fontFamily: "monospace", fontSize: 14, color: "rgba(255,255,255,0.6)", pointerEvents: "none" }}>@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
            placeholder="yourhandle"
            style={{ width: "100%", boxSizing: "border-box", background: "#110e0b", border: "1px solid #2a2520", borderRadius: 50, padding: "13px 18px 13px 34px", fontFamily: "monospace", fontSize: 14, color: "white", outline: "none" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#00e5ff")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2520")}
          />
        </div>

        {/* Display name */}
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          style={{ width: "100%", boxSizing: "border-box", background: "#110e0b", border: "1px solid #2a2520", borderRadius: 50, padding: "13px 18px", fontFamily: "monospace", fontSize: 14, color: "white", outline: "none" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#00e5ff")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2520")}
        />

        {error && (
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#ff3b30", textAlign: "center" }}>{error}</div>
        )}

        {/* Required note */}
        <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
          Handle and display name are required to continue.
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 50,
            background: "transparent",
            border: `1px solid ${canSubmit ? "#00e5ff" : "#2a2520"}`,
            color: canSubmit ? "#00e5ff" : "rgba(255,255,255,0.6)",
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 3,
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "border-color 0.2s, color 0.2s",
          }}
        >
          {loading ? "SAVING…" : "LET'S GO"}
        </button>
      </div>
    </div>
  );
}
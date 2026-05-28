"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const TENOR_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY ?? "";
const TRANCHE_BUCKET = "tranche-media";
const MAX_VIDEO_SECONDS = 30;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

type Theme = "light" | "dark";

type TenorGif = {
  id: string;
  media_formats: {
    tinygif?: { url: string };
    nanogif?: { url: string };
    gif?: { url: string };
    mediumgif?: { url: string };
  };
};

export type PostedReply = {
  id: string;
  postId: string;
  parentId: string | null;
  userEmail: string;
  body: string;
  createdAt: string;
};

type Props = {
  postId: string;
  parentId: string;
  viewerEmail: string | null;
  theme: Theme;
  open: boolean;
  onClose: () => void;
  onPosted: (reply: PostedReply) => void;
};

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const duration = v.duration;
      URL.revokeObjectURL(v.src);
      resolve(duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(v.src);
      reject(new Error("Could not read video"));
    };
    v.src = URL.createObjectURL(file);
  });
}

export default function TrancheReplyComposer({
  postId,
  parentId,
  viewerEmail,
  theme,
  open,
  onClose,
  onPosted,
}: Props) {
  const dark = theme === "dark";
  const ink = dark ? "#F5F2EC" : "#0F1115";
  const inkSoft = dark ? "rgba(245,242,236,0.66)" : "#4A4F58";
  const sheetBg = dark ? "#1A1815" : "#FFFFFF";
  const inputBg = dark ? "rgba(245,242,236,0.04)" : "#FFFFFF";
  const inputBorder = dark
    ? "1px solid rgba(245,242,236,0.16)"
    : "1px solid rgba(15,17,21,0.12)";

  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"gif" | "image" | "video" | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => textareaRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
    setBody("");
    setMediaUrl(null);
    setMediaKind(null);
    setGifOpen(false);
    setGifQuery("");
    setGifs([]);
    setError(null);
    setUploading(false);
  }, [open]);

  useEffect(() => {
    if (!open || !gifOpen || !TENOR_KEY) return;
    const ctrl = new AbortController();
    const q = gifQuery.trim();
    const url = q
      ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&client_key=revolvr-tranche&limit=20&media_filter=tinygif,mediumgif`
      : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&client_key=revolvr-tranche&limit=20&media_filter=tinygif,mediumgif`;
    setGifLoading(true);
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        setGifs(Array.isArray(d?.results) ? d.results : []);
      })
      .catch(() => null)
      .finally(() => setGifLoading(false));
    return () => ctrl.abort();
  }, [gifQuery, gifOpen, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const handlePickGif = (gif: TenorGif) => {
    const url =
      gif.media_formats?.mediumgif?.url ??
      gif.media_formats?.gif?.url ??
      gif.media_formats?.tinygif?.url;
    if (!url) return;
    setMediaUrl(url);
    setMediaKind("gif");
    setGifOpen(false);
  };

  const uploadFile = async (file: File, kind: "image" | "video") => {
    setUploading(true);
    setError(null);
    try {
      const ext =
        file.name.split(".").pop()?.toLowerCase() ||
        (kind === "image" ? "jpg" : "mp4");
      const path = `replies/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(TRANCHE_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(TRANCHE_BUCKET).getPublicUrl(path);
      setMediaUrl(data.publicUrl);
      setMediaKind(kind);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Image files only");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      setError("Image too large (10MB max)");
      return;
    }
    await uploadFile(f, "image");
  };

  const handleVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("Video files only");
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      setError("Video too large (60MB max)");
      return;
    }
    try {
      const duration = await getVideoDuration(f);
      if (duration > MAX_VIDEO_SECONDS + 0.5) {
        setError(
          `Video is ${Math.round(duration)}s — 30 seconds max for TRANCHE replies`,
        );
        return;
      }
    } catch {
      setError("Could not read video duration");
      return;
    }
    await uploadFile(f, "video");
  };

  const handlePost = async () => {
    if (!viewerEmail) return;
    const text = body.trim();
    if (!text && !mediaUrl) return;
    setPosting(true);
    setError(null);
    try {
      const marker =
        mediaKind === "gif"
          ? "[GIF]"
          : mediaKind === "image"
            ? "[IMG]"
            : mediaKind === "video"
              ? "[VIDEO]"
              : null;
      const composed =
        marker && mediaUrl
          ? text
            ? `${text}\n\n${marker} ${mediaUrl}`
            : `${marker} ${mediaUrl}`
          : text;

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          userEmail: viewerEmail,
          body: composed,
          parentId,
        }),
      });
      const data = await res.json();
      if (data?.ok && data.comment) {
        onPosted({
          id: data.comment.id,
          postId: data.comment.postId,
          parentId: data.comment.parentId,
          userEmail: data.comment.userEmail,
          body: data.comment.body,
          createdAt: data.comment.createdAt,
        });
        onClose();
      } else {
        setError("Could not post reply");
      }
    } catch {
      setError("Could not post reply");
    } finally {
      setPosting(false);
    }
  };

  const canPost = !!viewerEmail && !posting && !uploading && (body.trim().length > 0 || !!mediaUrl);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1000,
        }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="Reply"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: sheetBg,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: "12px 14px calc(env(safe-area-inset-bottom, 0px) + 12px)",
          zIndex: 1001,
          maxHeight: "85dvh",
          overflowY: "auto",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: ink,
          boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: dark ? "rgba(245,242,236,0.18)" : "rgba(15,17,21,0.18)",
            margin: "0 auto 10px",
          }}
        />

        {gifOpen ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <button
                onClick={() => setGifOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: inkSoft,
                  cursor: "pointer",
                  padding: 6,
                  fontFamily: "inherit",
                  fontSize: 13,
                }}
              >
                ← Back
              </button>
              <input
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                placeholder="Search GIFs"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: inputBorder,
                  borderRadius: 8,
                  background: inputBg,
                  color: ink,
                  fontFamily: "inherit",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>
            {!TENOR_KEY ? (
              <div style={{ fontSize: 12, color: inkSoft, padding: "20px 8px" }}>
                Tenor API key not configured. Set <code>NEXT_PUBLIC_TENOR_API_KEY</code> to enable GIF search.
              </div>
            ) : gifLoading ? (
              <div style={{ fontSize: 12, color: inkSoft, padding: "20px 8px" }}>
                Loading…
              </div>
            ) : gifs.length === 0 ? (
              <div style={{ fontSize: 12, color: inkSoft, padding: "20px 8px" }}>
                No results.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 6,
                }}
              >
                {gifs.map((g) => {
                  const thumb = g.media_formats?.tinygif?.url ?? g.media_formats?.nanogif?.url;
                  return (
                    <button
                      key={g.id}
                      onClick={() => handlePickGif(g)}
                      style={{
                        background: dark ? "rgba(245,242,236,0.04)" : "rgba(15,17,21,0.04)",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        aspectRatio: "1 / 1",
                        overflow: "hidden",
                        borderRadius: 6,
                      }}
                    >
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt="gif"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {mediaUrl && (
              <div
                style={{
                  position: "relative",
                  marginBottom: 10,
                  borderRadius: 10,
                  overflow: "hidden",
                  background: dark ? "rgba(245,242,236,0.04)" : "rgba(15,17,21,0.04)",
                }}
              >
                {mediaKind === "video" ? (
                  <video
                    src={mediaUrl}
                    controls
                    playsInline
                    style={{ width: "100%", maxHeight: 240, display: "block" }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl}
                    alt="attachment"
                    style={{
                      width: "100%",
                      maxHeight: 240,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMediaUrl(null);
                    setMediaKind(null);
                  }}
                  aria-label="Remove attachment"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: "rgba(0,0,0,0.65)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 999,
                    width: 28,
                    height: 28,
                    cursor: "pointer",
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={viewerEmail ? "Reply with intent…" : "Sign in to reply"}
              disabled={!viewerEmail}
              rows={3}
              style={{
                width: "100%",
                resize: "none",
                fontFamily: "inherit",
                fontSize: 16,
                lineHeight: 1.45,
                padding: "10px 12px",
                border: inputBorder,
                borderRadius: 8,
                background: inputBg,
                color: ink,
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {error && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#C44848",
                  background: dark ? "rgba(196,72,72,0.12)" : "#FCE7E7",
                  padding: "6px 10px",
                  borderRadius: 6,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
              }}
            >
              <ComposerIconButton
                dark={dark}
                onClick={() => setGifOpen(true)}
                disabled={uploading || posting}
                label="GIF"
                icon={<GifIcon color={inkSoft} />}
              />
              <ComposerIconButton
                dark={dark}
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading || posting}
                label={null}
                icon={<ImageIcon color={inkSoft} />}
              />
              <ComposerIconButton
                dark={dark}
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading || posting}
                label="30s"
                icon={<VideoIcon color={inkSoft} />}
              />

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImage}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={handleVideo}
              />

              {uploading && (
                <span style={{ fontSize: 11, color: inkSoft, letterSpacing: "0.08em" }}>
                  UPLOADING…
                </span>
              )}

              <button
                type="button"
                onClick={handlePost}
                disabled={!canPost}
                style={{
                  marginLeft: "auto",
                  background: dark ? "#B85C5C" : "#0F1115",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 18px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  cursor: canPost ? "pointer" : "default",
                  opacity: canPost ? 1 : 0.45,
                }}
              >
                {posting ? "…" : "REPLY"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function ComposerIconButton({
  dark,
  onClick,
  disabled,
  label,
  icon,
}: {
  dark: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string | null;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: dark ? "rgba(245,242,236,0.06)" : "#fff",
        border: dark
          ? "1px solid rgba(245,242,236,0.12)"
          : "1px solid rgba(15,17,21,0.12)",
        borderRadius: 8,
        padding: "7px 9px",
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        color: dark ? "rgba(245,242,236,0.66)" : "#4A4F58",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
}

function GifIcon({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9v6M7 12h2.5" />
      <path d="M12 9v6" />
      <path d="M17 9h-2v6M17 12h-2" />
    </svg>
  );
}
function ImageIcon({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
function VideoIcon({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

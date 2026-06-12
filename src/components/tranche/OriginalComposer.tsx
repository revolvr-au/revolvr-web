"use client";

import { useEffect, useRef, useState } from "react";
import type { OriginalItem } from "./OriginalCard";

const MAX_CHARS = 500;
const INK = "#0F1115";
const INK_SOFT = "#4A4F58";
const SLATE = "#2C3E50";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
];

type Props = {
  viewerEmail: string | null;
  open: boolean;
  onClose: () => void;
  onCreated: (item: OriginalItem) => void;
};

export default function OriginalComposer({
  viewerEmail,
  open,
  onClose,
  onCreated,
}: Props) {
  const [body, setBody] = useState("");
  const [language, setLanguage] = useState("en");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => textareaRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
    setBody("");
    setLanguage("en");
    setError(null);
    setPosting(false);
  }, [open]);

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

  const trimmed = body.trim();
  const canPost = !!viewerEmail && !posting && trimmed.length > 0;

  const handlePost = async () => {
    if (!viewerEmail || !trimmed) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/tranche/originals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: viewerEmail, body: trimmed, language }),
      });
      const data = await res.json();
      if (data?.ok && data.postId) {
        // Optimistic feed insert. Variants are generated server-side; we seed with
        // the body so the card renders immediately, the feed refetch fills the rest.
        const optimistic: OriginalItem = {
          id: data.postId,
          body: trimmed,
          originalVariants: [trimmed],
          userEmail: viewerEmail,
          createdAt: new Date().toISOString(),
          voltage: 0,
          replyCount: 0,
          author: { displayName: null, handle: null, avatarUrl: null },
          replies: [],
        };
        onCreated(optimistic);
        onClose();
      } else {
        setError(
          data?.error === "not_a_creator"
            ? "You need a creator profile to post an Original."
            : "Could not post Original.",
        );
      }
    } catch {
      setError("Could not post Original.");
    } finally {
      setPosting(false);
    }
  };

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
        aria-label="New Original"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#FFFFFF",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderTop: `4px solid ${SLATE}`,
          padding: "12px 14px calc(env(safe-area-inset-bottom, 0px) + 12px)",
          zIndex: 1001,
          maxHeight: "85dvh",
          overflowY: "auto",
          fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: INK,
          boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "rgba(15,17,21,0.18)",
            margin: "0 auto 12px",
          }}
        />

        <div
          style={{
            fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: "rgba(15,17,21,0.35)",
            marginBottom: 10,
          }}
        >
          NEW ORIGINAL
        </div>

        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_CHARS))}
          placeholder={viewerEmail ? "What's your take?" : "Sign in to post"}
          disabled={!viewerEmail || posting}
          rows={4}
          style={{
            width: "100%",
            resize: "none",
            fontFamily: "inherit",
            fontSize: 16,
            lineHeight: 1.5,
            padding: "10px 12px",
            border: "1px solid rgba(15,17,21,0.12)",
            borderRadius: 8,
            background: "#FFFFFF",
            color: INK,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={posting}
            aria-label="Language"
            style={{
              fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 11,
              color: INK_SOFT,
              background: "#FFFFFF",
              border: "1px solid rgba(15,17,21,0.12)",
              borderRadius: 6,
              padding: "4px 8px",
              outline: "none",
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <span
            style={{
              fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 11,
              color: trimmed.length >= MAX_CHARS ? "#C44848" : "rgba(15,17,21,0.4)",
            }}
          >
            {body.length}/{MAX_CHARS}
          </span>
        </div>

        {error && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#C44848",
              background: "#FCE7E7",
              padding: "6px 10px",
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
          {posting && (
            <span
              style={{
                fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 11,
                letterSpacing: "0.1em",
                color: INK_SOFT,
              }}
            >
              GENERATING HOOKS…
            </span>
          )}
          <button
            type="button"
            onClick={handlePost}
            disabled={!canPost}
            style={{
              marginLeft: "auto",
              background: INK,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 20px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              cursor: canPost ? "pointer" : "default",
              opacity: canPost ? 1 : 0.45,
            }}
          >
            {posting ? "…" : "POST"}
          </button>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

type Verdict = "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIABLE" | "SATIRE";

const VERDICTS: { value: Verdict; label: string; tone: string }[] = [
  { value: "TRUE", label: "TRUE", tone: "#1F8E4A" },
  { value: "FALSE", label: "FALSE", tone: "#C44848" },
  { value: "MISLEADING", label: "MISLEADING", tone: "#C8861F" },
  { value: "UNVERIFIABLE", label: "UNVERIFIABLE", tone: "#5A6473" },
  { value: "SATIRE", label: "SATIRE", tone: "#8845B3" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  trancheEventId: string;
  commentId: string;
  commentBody: string;
  viewerEmail: string;
  onFiled?: (factCheckId: string) => void;
};

export default function TrancheFactCheckSheet({
  open,
  onClose,
  theme,
  trancheEventId,
  commentId,
  commentBody,
  viewerEmail,
  onFiled,
}: Props) {
  const dark = theme === "dark";
  const ink = dark ? "#F5F2EC" : "#0F1115";
  const inkSoft = dark ? "rgba(245,242,236,0.66)" : "#4A4F58";
  const inkMute = dark ? "rgba(245,242,236,0.42)" : "#7A7F88";
  const sheetBg = dark ? "#1A1815" : "#FFFFFF";
  const inputBg = dark ? "rgba(245,242,236,0.04)" : "#FFFFFF";
  const inputBorder = dark
    ? "1px solid rgba(245,242,236,0.16)"
    : "1px solid rgba(15,17,21,0.12)";

  const [claim, setClaim] = useState(commentBody.slice(0, 280));
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [correction, setCorrection] = useState("");
  const [sourcesRaw, setSourcesRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setClaim(commentBody.slice(0, 280));
      setVerdict(null);
      setCorrection("");
      setSourcesRaw("");
      setError(null);
      setSubmitting(false);
      return;
    }
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, commentBody, onClose]);

  if (!open) return null;

  const sources = sourcesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const canSubmit =
    !!verdict && claim.trim().length >= 10 && !submitting && sources.every((s) => /^https?:\/\//i.test(s));

  const submit = async () => {
    if (!canSubmit || !verdict) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tfc/file-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trancheEventId,
          commentId,
          checkerEmail: viewerEmail,
          claim: claim.trim(),
          verdict,
          correction: correction.trim() || undefined,
          sources,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        onFiled?.(data.factCheckId);
        onClose();
      } else {
        setError(data?.error ?? "Could not file check");
      }
    } catch {
      setError("Could not file check");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 1000,
        }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="File TFC fact check"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: sheetBg,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: "14px 16px calc(env(safe-area-inset-bottom, 0px) + 14px)",
          zIndex: 1001,
          maxHeight: "90dvh",
          overflowY: "auto",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: ink,
          boxShadow: "0 -8px 32px rgba(0,0,0,0.3)",
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

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.22em",
              color: ink,
            }}
          >
            FILE FACT CHECK
          </span>
          <span style={{ fontSize: 11, color: inkMute, letterSpacing: "0.08em" }}>
            TFC · @{viewerEmail.split("@")[0]}
          </span>
        </div>

        <Label>CLAIM</Label>
        <textarea
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          rows={3}
          placeholder="Re-state the claim being checked"
          style={{
            ...textareaStyle(inputBg, inputBorder, ink),
            marginBottom: 12,
          }}
        />

        <Label>VERDICT</Label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {VERDICTS.map((v) => {
            const active = verdict === v.value;
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => setVerdict(v.value)}
                style={{
                  background: active ? v.tone : dark ? "rgba(245,242,236,0.04)" : "#fff",
                  color: active ? "#fff" : ink,
                  border: active ? `1px solid ${v.tone}` : inputBorder,
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  cursor: "pointer",
                }}
              >
                {v.label}
              </button>
            );
          })}
        </div>

        <Label>CORRECTION (optional)</Label>
        <textarea
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          rows={2}
          placeholder="What the accurate version looks like"
          style={{
            ...textareaStyle(inputBg, inputBorder, ink),
            marginBottom: 12,
          }}
        />

        <Label>SOURCES (comma-separated URLs)</Label>
        <textarea
          value={sourcesRaw}
          onChange={(e) => setSourcesRaw(e.target.value)}
          rows={2}
          placeholder="https://… , https://…"
          style={{
            ...textareaStyle(inputBg, inputBorder, ink),
            marginBottom: 8,
          }}
        />
        {sources.length > 0 && (
          <div
            style={{
              fontSize: 11,
              color: inkSoft,
              marginBottom: 12,
              letterSpacing: "0.04em",
            }}
          >
            {sources.length} source{sources.length === 1 ? "" : "s"}
          </div>
        )}

        {error && (
          <div
            style={{
              fontSize: 12,
              color: "#C44848",
              background: dark ? "rgba(196,72,72,0.12)" : "#FCE7E7",
              padding: "8px 10px",
              borderRadius: 6,
              marginBottom: 10,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              background: "transparent",
              border: inputBorder,
              color: inkSoft,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            style={{
              flex: 1,
              background: dark ? "#B85C5C" : "#0F1115",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              cursor: canSubmit ? "pointer" : "default",
              opacity: canSubmit ? 1 : 0.45,
            }}
          >
            {submitting ? "FILING…" : "FILE CHECK"}
          </button>
        </div>
      </div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        letterSpacing: "0.18em",
        fontWeight: 700,
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        marginBottom: 5,
        opacity: 0.7,
      }}
    >
      {children}
    </div>
  );
}

function textareaStyle(
  bg: string,
  border: string,
  ink: string,
): React.CSSProperties {
  return {
    width: "100%",
    resize: "none",
    fontFamily: "inherit",
    fontSize: 14,
    lineHeight: 1.5,
    padding: "10px 12px",
    border,
    borderRadius: 8,
    background: bg,
    color: ink,
    outline: "none",
    boxSizing: "border-box",
  };
}

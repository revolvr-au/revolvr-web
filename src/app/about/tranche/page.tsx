"use client";

import { useRouter } from "next/navigation";

export default function TranchePage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0806",
      color: "white",
      fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: 480,
      margin: "0 auto",
      padding: "24px 20px 60px",
    }}>
      <style>{`
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 48 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "4px 2px" }}
        >←</button>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
          About
        </div>
        <div style={{ width: 30 }} />
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
        fontSize: 64,
        letterSpacing: 3,
        color: "white",
        margin: "0 0 10px",
        lineHeight: 1,
      }}>
        TRANCHE
      </h1>

      {/* Subtitle */}
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 36px", lineHeight: 1.6 }}>
        Structured discussion. Coming soon.
      </p>

      <div style={{ borderTop: "1px solid #1a1510", marginBottom: 32 }} />

      {/* Description */}
      <p style={{ fontSize: 13, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
        TRANCHE converts comments into threaded topic conversations — giving every voice
        a place to go deeper. Instead of a flat stream of replies, TRANCHE organises
        discussion around ideas, so the best conversations rise to the surface.
      </p>

      <div style={{ borderTop: "1px solid #1a1510", marginBottom: 32 }} />

      {/* Status badge */}
      <div>
        <span style={{
          fontFamily: "monospace",
          fontSize: 10,
          letterSpacing: 2,
          color: "#ffffff",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 4,
          padding: "4px 10px",
          textTransform: "uppercase",
        }}>
          Coming Soon
        </span>
      </div>
    </div>
  );
}

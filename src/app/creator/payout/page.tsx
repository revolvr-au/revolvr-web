"use client";

import { useRouter } from "next/navigation";

export default function CreatorPayoutPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0806",
      color: "white",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      maxWidth: 480,
      margin: "0 auto",
      padding: "24px 20px 60px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 48 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "4px 2px" }}
        >←</button>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: "#333", textTransform: "uppercase" }}>
          Creator
        </div>
        <div style={{ width: 30 }} />
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 52,
        letterSpacing: 2,
        color: "white",
        margin: "0 0 10px",
        lineHeight: 1,
      }}>
        Payout Settings
      </h1>

      {/* Subtitle */}
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 36px", lineHeight: 1.6 }}>
        Configure your payout preferences and connected accounts.
      </p>

      <div style={{ borderTop: "1px solid #1a1510", marginBottom: 32 }} />

      {/* Status badge */}
      <span style={{
        fontFamily: "monospace",
        fontSize: 10,
        letterSpacing: 2,
        color: "#00e5ff",
        border: "1px solid rgba(0,229,255,0.3)",
        borderRadius: 4,
        padding: "4px 10px",
        textTransform: "uppercase",
      }}>
        Coming Soon
      </span>
    </div>
  );
}

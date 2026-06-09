"use client";

import { useRouter } from "next/navigation";

export default function AboutPage() {
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
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
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
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 64,
        letterSpacing: 3,
        color: "white",
        margin: "0 0 10px",
        lineHeight: 1,
      }}>
        REVOLVR
      </h1>

      {/* Subtitle */}
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 36px", lineHeight: 1.6 }}>
        A new kind of social platform. Built in Australia.
      </p>

      <div style={{ borderTop: "1px solid #1a1510", marginBottom: 32 }} />

      {/* WHAT WE ARE */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 12 }}>
          What We Are
        </div>
        <p style={{ fontSize: 13, color: "#888", lineHeight: 1.8, margin: 0 }}>
          Revolvr is a short-form video platform built around live battles, creator-first monetisation,
          and real connection. We believe creators deserve more — which is why we pay out
          75% of all earnings directly to the people who make the content.
          No middlemen. No algorithm games. Just creators and their audience.
        </p>
      </div>

      <div style={{ borderTop: "1px solid #1a1510", marginBottom: 32 }} />

      {/* OUR MISSION */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 12 }}>
          Our Mission
        </div>
        <p style={{ fontSize: 13, color: "#888", lineHeight: 1.8, margin: 0 }}>
          We exist to build a fair platform where creators earn what they truly deserve.
          Revolvr is Australian owned and operated — built with transparency,
          community, and long-term creator success at its core.
        </p>
      </div>

      <div style={{ borderTop: "1px solid #1a1510", marginBottom: 32 }} />

      {/* CONTACT */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 12 }}>
          Contact
        </div>
        <a
          href="mailto:revolvrassist@gmail.com"
          style={{ fontSize: 13, color: "#00e5ff", textDecoration: "none", letterSpacing: 0.3 }}
        >
          revolvrassist@gmail.com
        </a>
      </div>

      <div style={{ borderTop: "1px solid #1a1510", marginBottom: 32 }} />

      {/* Business */}
      <div>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 8 }}>
          Business
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>Revolvr Pty Ltd (Australia)</p>
      </div>
    </div>
  );
}

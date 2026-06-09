"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const BUNDLES = [
  { sparks: 100,  price: "$2.99",  cents: 299,  label: "STARTER" },
  { sparks: 300,  price: "$7.99",  cents: 799,  label: "CHARGED" },
  { sparks: 750,  price: "$17.99", cents: 1799, label: "AMPLIFIED" },
  { sparks: 2000, price: "$39.99", cents: 3999, label: "OVERLOADED" },
];

export default function BuySparksPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    if (selected === null) return;
    setLoading(true);
    const bundle = BUNDLES[selected];
    const res = await fetch("/api/sparks/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cents: bundle.cents, sparks: bundle.sparks }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0a0806",
      color: "white",
      fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: 480,
      margin: "0 auto",
      padding: "24px 20px 60px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        @keyframes boltPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.92); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer" }}
        >←</button>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: "#333" }}>
          SPARKS
        </div>
        <div style={{ width: 30 }} />
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 48, animation: "boltPulse 2s ease-in-out infinite" }}>⚡</div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 52,
          letterSpacing: 3,
          color: "white",
          margin: "8px 0 4px",
          lineHeight: 1,
        }}>
          BUY SPARKS
        </h1>
        <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
          Gift creators. Fuel battles. Inject voltage.
        </p>
      </div>

      <div style={{ borderTop: "1px solid #1a1510", margin: "28px 0" }} />

      {/* Bundles */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {BUNDLES.map((bundle, i) => (
          <button
            key={bundle.sparks}
            onClick={() => setSelected(i)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              background: selected === i ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${selected === i ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 14,
              padding: "18px 20px",
              cursor: "pointer",
              transition: "all 0.15s",
              boxSizing: "border-box",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{
                fontFamily: "monospace",
                fontSize: 9,
                letterSpacing: "0.2em",
                color: selected === i ? "#D4AF37" : "#444",
                marginBottom: 4,
              }}>
                {bundle.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: "white" }}>
                  {bundle.sparks.toLocaleString()}
                </span>
                <span style={{ fontSize: 16, color: "#D4AF37" }}>⚡</span>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: 22,
                fontWeight: 700,
                color: selected === i ? "#D4AF37" : "rgba(255,255,255,0.7)",
              }}>
                {bundle.price}
              </div>
              <div style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>AUD</div>
            </div>

            {selected === i && (
              <div style={{
                position: "absolute",
                right: 20,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#D4AF37",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "#0a0806",
                fontWeight: 700,
              }}>✓</div>
            )}
          </button>
        ))}
      </div>

      {/* Purchase button */}
      <button
        onClick={handlePurchase}
        disabled={selected === null || loading}
        style={{
          width: "100%",
          padding: "16px 0",
          borderRadius: 50,
          background: selected !== null ? "#D4AF37" : "rgba(255,255,255,0.05)",
          border: "none",
          color: selected !== null ? "#0a0806" : "#333",
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 20,
          letterSpacing: 3,
          cursor: selected !== null ? "pointer" : "not-allowed",
          transition: "all 0.2s",
        }}
      >
        {loading ? "REDIRECTING…" : selected !== null ? `BUY ${BUNDLES[selected].sparks.toLocaleString()} SPARKS` : "SELECT A BUNDLE"}
      </button>

      <p style={{ textAlign: "center", fontSize: 11, color: "#333", marginTop: 16, lineHeight: 1.6 }}>
        Sparks are used to gift creators and fuel battles.<br />
        10% of all creator earnings are held as tax reserve.
      </p>
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { TERMS_TEXT, TERMS_LAST_UPDATED } from "@/legal/terms.en";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0806",
      color: "white",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      maxWidth: 680,
      margin: "0 auto",
      padding: "24px 20px 60px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer", lineHeight: 1 }}
        >←</button>
        <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 3, color: "#333", textTransform: "uppercase" }}>
          Legal
        </div>
        <div style={{ width: 22 }} />
      </div>

      <h1 style={{ fontFamily: "monospace", fontSize: 16, letterSpacing: 3, color: "#00e5ff", textTransform: "uppercase", marginBottom: 8 }}>
        Terms & Conditions
      </h1>
      <p style={{ fontSize: 11, fontFamily: "monospace", color: "#333", marginBottom: 32 }}>
        Last updated: {TERMS_LAST_UPDATED}
      </p>

      <pre style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontSize: 13,
        lineHeight: 1.8,
        color: "#aaa",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        {TERMS_TEXT.trim()}
      </pre>
    </div>
  );
}

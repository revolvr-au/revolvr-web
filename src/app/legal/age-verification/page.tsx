"use client";

import { useRouter } from "next/navigation";
import {
  AGE_POLICY_TEXT,
  AGE_POLICY_LAST_UPDATED,
  AGE_POLICY_IS_DRAFT,
} from "@/legal/age-verification.en";

export default function AgeVerificationPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0806",
      color: "white",
      fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: 680,
      margin: "0 auto",
      padding: "24px 20px 60px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer", lineHeight: 1 }}
        >←</button>
        <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 3, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
          Legal
        </div>
        <div style={{ width: 22 }} />
      </div>

      <h1 style={{ fontFamily: "monospace", fontSize: 16, letterSpacing: 3, color: "#ffffff", textTransform: "uppercase", marginBottom: 8 }}>
        Age Verification Policy
      </h1>
      <p style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.6)", marginBottom: 32 }}>
        Last updated: {AGE_POLICY_LAST_UPDATED}
      </p>

      {AGE_POLICY_IS_DRAFT && (
        <div style={{
          border: "1px solid rgba(255,180,60,0.5)",
          background: "rgba(255,180,60,0.08)",
          color: "#ffcc66",
          fontFamily: "monospace",
          fontSize: 11,
          letterSpacing: 1,
          lineHeight: 1.6,
          padding: "12px 14px",
          marginBottom: 28,
        }}>
          DRAFT — PENDING LEGAL REVIEW. This policy is not yet final and does not
          represent Revolvr&apos;s published position.
        </div>
      )}

      <pre style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontSize: 13,
        lineHeight: 1.8,
        color: "#aaa",
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        {AGE_POLICY_TEXT.trim()}
      </pre>
    </div>
  );
}

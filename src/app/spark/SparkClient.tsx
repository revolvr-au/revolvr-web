"use client";

import FeedLayout from "@/components/FeedLayout";

// Stub — full implementation added in Phase 4
export function SparkContent() {
  return (
    <FeedLayout>
      <div style={{
        height: "100dvh",
        paddingTop: 72,
        paddingBottom: 80,
        paddingLeft: 20,
        paddingRight: 20,
        overflowY: "auto",
        scrollbarWidth: "none",
      }}>
        <h1 style={{
          fontFamily: "monospace",
          fontSize: 32,
          letterSpacing: 4,
          color: "white",
          margin: "0 0 8px",
        }}>
          SPARK
        </h1>
        <p style={{ fontSize: 13, color: "#555", margin: 0 }}>Loading…</p>
      </div>
    </FeedLayout>
  );
}

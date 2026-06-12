"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sparks = searchParams.get("sparks");

  return (
    <div style={{
      minHeight: "100dvh", background: "#0a0806",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 20px", textAlign: "center",
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>⚡</div>
      <div style={{
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
        fontSize: 42, letterSpacing: 3, color: "#ffffff", marginBottom: 8,
      }}>
        {sparks} SPARKS LOADED
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 32 }}>
        Your sparks are ready. Go gift a creator.
      </p>
      <button
        onClick={() => router.push("/public-feed")}
        style={{
          background: "#ffffff", border: "none", borderRadius: 50,
          padding: "14px 40px", fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
          fontSize: 18, letterSpacing: 3, color: "#0a0806", cursor: "pointer",
        }}
      >
        BACK TO FEED
      </button>
    </div>
  );
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>;
}
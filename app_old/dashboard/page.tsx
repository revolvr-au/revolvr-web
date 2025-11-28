"use client";

import React, { useState } from "react";

export default function DashboardPage() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleTestTip() {
    try {
      setStatus("Calling /api/payments/checkout…");

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "tip",
          userEmail: "revolvr.au@gmail.com",
          amountCents: 200, // $2 AUD
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Checkout failed:", text);
        setStatus("Checkout failed: " + text.slice(0, 160));
        return;
      }

      const data = await res.json();
      console.log("Checkout response:", data);

      if (data.url) {
        setStatus("Redirecting to Stripe Checkout…");
        window.location.href = data.url;
      } else {
        setStatus("Stripe did not return a checkout URL.");
      }
    } catch (err: any) {
      console.error("Error creating checkout:", err);
      setStatus("Error: " + (err?.message ?? "unknown"));
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050816",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "28px", fontWeight: 700 }}>
        APP_OLD Dashboard · PAYMENT DEBUG
      </h1>
      <p style={{ fontSize: "12px", opacity: 0.7 }}>
        File: <code>app_old/dashboard/page.tsx</code>
      </p>

      <button
        type="button"
        onClick={handleTestTip}
        style={{
          padding: "12px 24px",
          borderRadius: "999px",
          border: "none",
          background: "#6366f1",
          color: "white",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Test $2 tip (Stripe)
      </button>

      {status && (
        <p
          style={{
            fontSize: "12px",
            opacity: 0.8,
            maxWidth: "520px",
            textAlign: "center",
          }}
        >
          STATUS: {status}
        </p>
      )}
    </main>
  );
}

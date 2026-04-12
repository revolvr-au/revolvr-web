"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

export default function DeleteAccountPage() {
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    if (!confirmed) return;

    await fetch("/api/account/delete", { method: "POST" });
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/public-feed");
  };

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 48 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer", lineHeight: 1 }}
        >←</button>
        <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 3, color: "#333", textTransform: "uppercase" }}>
          Account
        </div>
        <div style={{ width: 22 }} />
      </div>

      <h1 style={{ fontFamily: "monospace", fontSize: 16, letterSpacing: 3, color: "#ff4444", textTransform: "uppercase", marginBottom: 16 }}>
        Delete Account
      </h1>

      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.8, marginBottom: 12 }}>
        Deleting your account is permanent and cannot be undone.
      </p>

      <div style={{ borderTop: "1px solid #1a1510", margin: "24px 0" }} />

      {[
        "Your profile and handle will be removed",
        "All posts and content will be deleted",
        "Your follower and following relationships will be removed",
        "Any pending earnings or credits may be forfeited",
      ].map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
          <span style={{ color: "#ff4444", fontSize: 11, marginTop: 2, flexShrink: 0 }}>✕</span>
          <span style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{item}</span>
        </div>
      ))}

      <div style={{ borderTop: "1px solid #1a1510", margin: "32px 0" }} />

      <button
        onClick={handleDelete}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 50,
          background: "transparent",
          border: "1px solid #ff4444",
          color: "#ff4444",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "monospace",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Delete My Account
      </button>

      <button
        onClick={() => router.back()}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 50,
          background: "transparent",
          border: "none",
          color: "#333",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "monospace",
          letterSpacing: 1,
          marginTop: 12,
        }}
      >
        Cancel
      </button>
    </div>
  );
}

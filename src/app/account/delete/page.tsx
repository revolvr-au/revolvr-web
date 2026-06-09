"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusEmail, setFocusEmail] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email.trim().toLowerCase());
      }
    });
  }, []);

  const emailMatches =
    userEmail !== null &&
    emailInput.trim().toLowerCase() === userEmail;

  const handleDelete = async () => {
    if (!emailMatches) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "global" });
      window.location.href = "/welcome";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  const warnings = [
    "Your profile and handle will be permanently removed",
    "All posts and content will be deleted",
    "Your follower and following relationships will be removed",
    "Any pending earnings or credits may be forfeited",
    "This action cannot be reversed",
  ];

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
        .delete-email-input::placeholder { color: rgba(255,255,255,0.6); }
        .delete-email-input:focus {
          outline: none;
          border-color: #00e5ff !important;
        }
        .delete-btn-active:hover {
          background: rgba(255,59,48,0.08) !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 48 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "4px 2px" }}
        >←</button>
        <div style={{
          fontFamily: "monospace",
          fontSize: 9,
          letterSpacing: 3,
          color: "rgba(255,255,255,0.6)",
          textTransform: "uppercase",
        }}>
          Account
        </div>
        <div style={{ width: 30 }} />
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 52,
        letterSpacing: 2,
        color: "#ff3b30",
        textTransform: "uppercase",
        margin: "0 0 12px",
        lineHeight: 1,
      }}>
        Delete Account
      </h1>

      {/* Subtitle */}
      <p style={{ fontSize: 13, color: "#888", lineHeight: 1.7, margin: "0 0 24px" }}>
        This is permanent and cannot be undone.
      </p>

      {/* Separator */}
      <div style={{ borderTop: "1px solid #1a1510", marginBottom: 24 }} />

      {/* Warning list */}
      {warnings.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
          <span style={{ color: "#ff3b30", fontSize: 12, marginTop: 1, flexShrink: 0, fontWeight: 700 }}>×</span>
          <span style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>{item}</span>
        </div>
      ))}

      {/* Separator */}
      <div style={{ borderTop: "1px solid #1a1510", margin: "28px 0" }} />

      {/* Email confirmation input */}
      <input
        className="delete-email-input"
        type="email"
        placeholder="Enter your email to confirm"
        value={emailInput}
        onChange={e => { setEmailInput(e.target.value); setError(null); }}
        onFocus={() => setFocusEmail(true)}
        onBlur={() => setFocusEmail(false)}
        autoComplete="off"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "13px 16px",
          borderRadius: 50,
          background: "#0f0d0a",
          border: `1px solid ${focusEmail ? "#00e5ff" : "#1e1a14"}`,
          color: "white",
          fontSize: 13,
          fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          marginBottom: 16,
          transition: "border-color 0.15s",
        }}
      />

      {/* Error */}
      {error && (
        <p style={{ color: "#ff3b30", fontSize: 12, marginBottom: 14 }}>{error}</p>
      )}

      {/* Delete button */}
      <button
        className={emailMatches && !loading ? "delete-btn-active" : ""}
        onClick={handleDelete}
        disabled={!emailMatches || loading}
        style={{
          width: "100%",
          padding: "15px 0",
          borderRadius: 50,
          background: "transparent",
          border: `1px solid ${emailMatches ? "#ff3b30" : "#333"}`,
          color: emailMatches ? "white" : "rgba(255,255,255,0.6)",
          fontSize: 18,
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: 2,
          textTransform: "uppercase",
          cursor: emailMatches && !loading ? "pointer" : "not-allowed",
          transition: "border-color 0.2s, color 0.2s",
        }}
      >
        {loading ? "Deleting…" : "Delete My Account"}
      </button>

      {/* Cancel */}
      <button
        onClick={() => router.back()}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 50,
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.6)",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          letterSpacing: 0.5,
          marginTop: 10,
        }}
      >
        Cancel
      </button>
    </div>
  );
}

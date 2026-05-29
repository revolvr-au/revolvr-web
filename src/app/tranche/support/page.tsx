"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

const TFC_PREFILL =
  "I am writing on behalf of a fact-check organisation or as a professional journalist and would like to be considered for TFC Professional status.\n\nMy organisation / publication: \nMy role: \nLinks to my recent work: \n\nWhat I'd like to discuss: ";

function SupportForm() {
  const params = useSearchParams();
  const type = params.get("type") === "tfc" ? "tfc" : "general";

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (type === "tfc" && !message) setMessage(TFC_PREFILL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!name.trim() || !email.includes("@") || !message.trim()) {
      setError("Please fill in name, a valid email, and a message.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tranche/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim() || null,
          email: email.trim(),
          message: message.trim(),
          type,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setSent(true);
      } else {
        setError(
          data?.error === "invalid_input"
            ? "Please fill in all required fields."
            : "Something went wrong. Please try again.",
        );
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div
        style={{
          marginTop: 28,
          padding: "20px 22px",
          background: "#F5F2EC",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 11,
            letterSpacing: "0.22em",
            fontWeight: 700,
            color: "#0A0A0A",
            marginBottom: 8,
          }}
        >
          MESSAGE SENT
        </div>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "rgba(0,0,0,0.78)",
            margin: 0,
          }}
        >
          Thanks {name.trim().split(" ")[0] || "there"} — we&apos;ve received
          your message and will be in touch by email within 1–2 business days.
        </p>
        <Link
          href="/tranche"
          style={{
            display: "inline-block",
            marginTop: 18,
            fontSize: 12,
            color: "rgba(0,0,0,0.55)",
            textDecoration: "none",
            letterSpacing: "0.08em",
          }}
        >
          ← Back to TRANCHE
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 28 }}
    >
      <Field label="Name" required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={200}
          style={inputStyle}
          autoComplete="name"
        />
      </Field>

      <Field label="Company" hint="Optional">
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          maxLength={200}
          style={inputStyle}
          autoComplete="organization"
        />
      </Field>

      <Field label="Email" required>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
          autoComplete="email"
        />
      </Field>

      <Field label="Message" required>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={8}
          maxLength={5000}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
        />
      </Field>

      {error && (
        <div
          style={{
            fontSize: 13,
            color: "#B85C5C",
            background: "rgba(184,92,92,0.08)",
            padding: "10px 12px",
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          marginTop: 4,
          background: "#0A0A0A",
          color: "#FFFFFF",
          border: "none",
          borderRadius: 6,
          padding: "14px 18px",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.22em",
          cursor: submitting ? "default" : "pointer",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "SENDING…" : "SEND MESSAGE"}
      </button>
    </form>
  );
}

export default function TrancheSupportPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#FFFFFF",
        color: "#0A0A0A",
        padding:
          "calc(env(safe-area-inset-top, 0px) + 28px) 22px calc(env(safe-area-inset-bottom, 0px) + 28px)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Bebas+Neue&family=Space+Grotesk:wght@500;600;700&display=swap');
      `}</style>

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link
          href="/tranche"
          style={{
            display: "inline-block",
            fontSize: 12,
            color: "rgba(0,0,0,0.55)",
            textDecoration: "none",
            letterSpacing: "0.08em",
            marginBottom: 18,
          }}
        >
          ← TRANCHE
        </Link>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(48px, 10vw, 84px)",
            letterSpacing: "0.04em",
            margin: 0,
            lineHeight: 0.95,
            color: "#0A0A0A",
          }}
        >
          BUSINESS SUPPORT
        </h1>
        <p
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "rgba(0,0,0,0.55)",
            letterSpacing: "0.04em",
            lineHeight: 1.55,
          }}
        >
          Business enquiries, TFC Professional applications, and platform-level
          questions. We respond by email within 1–2 business days.
        </p>

        <Suspense
          fallback={
            <div style={{ marginTop: 28, fontSize: 14, color: "rgba(0,0,0,0.55)" }}>
              Loading…
            </div>
          }
        >
          <SupportForm />
        </Suspense>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: 15,
  color: "#0A0A0A",
  background: "#FFFFFF",
  border: "1px solid rgba(0,0,0,0.18)",
  borderRadius: 6,
  outline: "none",
  boxSizing: "border-box",
};

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: 11,
          letterSpacing: "0.18em",
          fontWeight: 700,
          color: "#0A0A0A",
          textTransform: "uppercase",
        }}
      >
        {label}
        {required && <span style={{ color: "#B85C5C", marginLeft: 4 }}>*</span>}
        {hint && !required && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 10,
              color: "rgba(0,0,0,0.4)",
              letterSpacing: "0.08em",
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

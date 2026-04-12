"use client";

import { useRouter } from "next/navigation";

export default function GuidelinesPage() {
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
        Community Guidelines
      </h1>
      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 32 }}>
        Revolvr is built for professional, safe engagement between Brands and Creators.
        By using the Platform you agree to follow these rules.
      </p>

      {[
        { heading: "No harassment or hate", body: "Harassment, threats, hate speech, or targeted abuse are prohibited." },
        { heading: "No scams or fraud", body: "Do not attempt to deceive users, solicit money off-platform dishonestly, or impersonate payment flows." },
        { heading: "No impersonation", body: "Do not pretend to be another person, brand, or organisation." },
        { heading: "No illegal or exploitative content", body: "Content that is illegal, exploitative, or harmful is not permitted." },
        { heading: "Minors", body: "Revolvr is intended for users 13 years of age and older. Some features (including payments and certain creator tools) are available only to users 18+." },
        { heading: "Reporting", body: "If you feel unsafe or see a violation, contact us at revolvrassist@gmail.com." },
        { heading: "Enforcement", body: "We may remove content, restrict access, or suspend accounts to maintain platform safety." },
      ].map((item, i) => (
        <div key={i} style={{ marginBottom: 24, borderTop: "1px solid #1a1510", paddingTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 6 }}>{item.heading}</div>
          <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{item.body}</div>
        </div>
      ))}
    </div>
  );
}

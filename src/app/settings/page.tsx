"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <main
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 99999,
        background: "#050505",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Navigation */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(5, 5, 5, 0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            marginLeft: -8,
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1
          style={{
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontFamily: "monospace",
            marginLeft: 8,
          }}
        >
          Settings
        </h1>
      </header>

      {/* Settings Content Area */}
      <div style={{ padding: "24px 16px", flex: 1 }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "monospace" }}>
          [ SYSTEM CONFIGURATION ]
        </p>
      </div>
    </main>
  );
}

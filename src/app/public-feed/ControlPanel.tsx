"use client";

import { useRouter } from "next/navigation";
import { Settings, X } from "lucide-react";
import SlideUpSheet from "@/components/SlideUpSheet";

type ControlPanelProps = {
  userId: string | null;
  onClose: () => void;
};

export default function ControlPanel({ userId, onClose }: ControlPanelProps) {
  const router = useRouter();

  return (
    <SlideUpSheet open={!!userId} onClose={onClose}>
      <div
        style={{
          background: "white",
          color: "black",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: "16px",
          paddingBottom: `max(16px, env(safe-area-inset-bottom, 16px))`,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          height: "40dvh",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontWeight: 700, fontSize: 18 }}>Control Panel</h2>
          <button
            onClick={onClose}
            aria-label="Close control panel"
            style={{
              background: "#f0f0f0",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <p style={{ fontSize: 14, color: "#555" }}>
            Viewing controls for user:{" "}
            <span style={{ fontFamily: "monospace", color: "#000" }}>{userId}</span>
          </p>

          <button
            onClick={() => router.push("/settings")}
            style={{
              marginTop: 24,
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "#e0f7fa",
              border: "1px solid #4dd0e1",
              borderRadius: 12,
              color: "#00796b",
              fontSize: 16,
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </SlideUpSheet>
  );
}
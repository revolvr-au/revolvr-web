"use client";

import { useState } from "react";

const BORDER = "rgba(255,255,255,0.08)";
const CARD = "#070b1b";
const MAX_LEN = 4000;

export default function MessageComposer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed.slice(0, MAX_LEN));
    setText("");
  };

  return (
    <div
      style={{
        flex: "0 0 auto",
        borderTop: `1px solid ${BORDER}`,
        padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 10px)",
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Message…"
        rows={1}
        maxLength={MAX_LEN}
        style={{
          flex: 1,
          resize: "none",
          maxHeight: 120,
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 18,
          padding: "10px 14px",
          color: "rgba(255,255,255,0.92)",
          fontSize: 14,
          fontFamily: "inherit",
          lineHeight: 1.4,
          outline: "none",
        }}
      />
      <button
        onClick={submit}
        disabled={!text.trim()}
        aria-label="Send message"
        style={{
          flexShrink: 0,
          background: text.trim() ? "#F5C518" : "rgba(255,255,255,0.1)",
          color: text.trim() ? "#0A0A0A" : "rgba(255,255,255,0.6)",
          border: "none",
          borderRadius: 18,
          padding: "10px 16px",
          fontSize: 14,
          fontWeight: 700,
          cursor: text.trim() ? "pointer" : "default",
        }}
      >
        Send
      </button>
    </div>
  );
}

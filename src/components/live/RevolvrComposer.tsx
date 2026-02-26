"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export default function RevolvrComposer({ roomId }: { roomId: string }) {
  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      await fetch("/api/live/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          message,
        }),
      });

      setMessage("");
    } catch (err) {
      console.error("Send message error", err);
    }
  };

  return (
    <div className="absolute bottom-6 left-4 right-4 z-50">
      <div className="flex items-center gap-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-full px-5 py-3">

        {/* Input */}
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Say something..."
          className="flex-1 bg-transparent outline-none text-white placeholder-white/50 text-base"
        />

        {/* Send Icon */}
        <button
          onClick={sendMessage}
          className="text-white/80 hover:text-white transition duration-200"
        >
          <Send size={22} strokeWidth={2.2} />
        </button>

      </div>
    </div>
  );
}
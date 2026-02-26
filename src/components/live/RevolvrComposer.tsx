"use client";

import { useState } from "react";

export default function RevolvrComposer() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      setLoading(true);

      await fetch("/api/live/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      setMessage("");
    } catch (err) {
      console.error("Chat send failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-6 left-4 right-4 z-50">
      <div className="flex items-center gap-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-full px-4 py-3">

        {/* Input */}
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Say something..."
          className="flex-1 bg-transparent outline-none text-white placeholder-white/50"
        />

        {/* Emoji */}
        <button
          onClick={() => setMessage((prev) => prev + " 😊")}
          className="text-xl"
        >
          😊
        </button>

        {/* Gift (inline only) */}
        <button
          onClick={() => console.log("Gift clicked")}
          className="text-xl"
        >
          🎁
        </button>

        {/* Send */}
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-emerald-500 text-black px-5 py-2 rounded-full font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
}
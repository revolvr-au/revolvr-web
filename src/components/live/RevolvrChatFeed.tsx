"use client";

import { useEffect, useState } from "react";

export default function RevolvrChatFeed() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/live/chat");
      const data = await res.json();
      setMessages(data.messages || []);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute left-4 bottom-28 space-y-3 z-40">
      {messages.map((msg, i) => (
        <div
          key={i}
          className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-4 py-2 text-white text-sm max-w-xs"
        >
          {msg.message}
        </div>
      ))}
    </div>
  );
}
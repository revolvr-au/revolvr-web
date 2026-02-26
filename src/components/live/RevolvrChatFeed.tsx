"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type ChatMessage = {
  id: string;
  message: string;
  display_name?: string;
};

export default function RevolvrChatFeed({ roomId }: { roomId: string }) {
  const [floating, setFloating] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const interval = setInterval(async () => {
      const res = await fetch(
        `/api/live/chat?roomId=${encodeURIComponent(roomId)}&limit=5`
      );

      if (!res.ok) return;

      const data = await res.json();
      const latest = data.messages?.slice(-1)[0];

      if (!latest) return;

      setFloating((prev) => [
        ...prev,
        {
          id: latest.id,
          message: latest.message,
          display_name: latest.display_name,
        },
      ]);

      // Remove after 4 seconds
      setTimeout(() => {
        setFloating((prev) =>
          prev.filter((m) => m.id !== latest.id)
        );
      }, 4000);

    }, 1200);

    return () => clearInterval(interval);
  }, [roomId]);

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {floating.map((msg, index) => (
        <motion.div
  key={msg.id}
  initial={{ opacity: 0, x: -60, y: 120 }}
  animate={{ opacity: 1, x: 80, y: -260 }}
  transition={{ duration: 4.5, ease: "easeOut" }}
  className="absolute left-4 top-1/2 max-w-xs backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl px-4 py-2 text-white text-sm"
>
  <span className="font-bold drop-shadow-md">
    {msg.display_name || "user"}
  </span>{" "}
  {msg.message}
</motion.div>
      ))}
    </div>
  );
}
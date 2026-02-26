"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function RevolvrChatFeed({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const interval = setInterval(async () => {
      const res = await fetch(
        `/api/live/chat?roomId=${encodeURIComponent(roomId)}&limit=50`
      );

      if (!res.ok) return;

      const data = await res.json();
      setMessages(data.messages || []);
    }, 1200);

    return () => clearInterval(interval);
  }, [roomId]);

  return (
    <div className="absolute left-4 bottom-28 space-y-3 z-40 max-w-xs">
      <AnimatePresence>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-4 py-2 text-white text-sm"
          >
            <span className="text-emerald-400 font-medium">
              {msg.display_name || "user"}
            </span>
            {" "}
            {msg.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ChatMessage = {
  id: string;
  message: string;
  display_name?: string;
};

export default function RevolvrChatFeed({ roomId }: { roomId: string }) {
  const [floating, setFloating] = useState<ChatMessage[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/live/chat?roomId=${encodeURIComponent(roomId)}&limit=5`,
          { cache: "no-store" }
        );

        if (!res.ok) return;

        const data = await res.json();
        const latest = data.messages?.slice(-1)[0];

        if (!latest) return;
        if (seenIds.current.has(latest.id)) return;

        seenIds.current.add(latest.id);

        setFloating((prev) => [
          ...prev,
          {
            id: latest.id,
            message: latest.message,
            display_name: latest.display_name,
          },
        ]);

        // remove after 5s
        setTimeout(() => {
          setFloating((prev) =>
            prev.filter((m) => m.id !== latest.id)
          );
        }, 5000);

      } catch {
        // silent fail
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [roomId]);

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {floating.map((msg, index) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: -80, y: 40 }}
            animate={{ opacity: 1, x: 60, y: -240 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 5,
              ease: "easeOut",
            }}
            className="absolute left-6 bottom-28 max-w-[70%]"
            style={{
              textShadow: "0 3px 18px rgba(0,0,0,0.85)",
            }}
          >
            <span className="text-white font-semibold text-lg">
              {msg.display_name || "user"}{" "}
            </span>
            <span className="text-white text-lg">
              {msg.message}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
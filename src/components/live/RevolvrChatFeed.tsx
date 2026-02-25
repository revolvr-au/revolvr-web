"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  user: string;
  text: string;
};

export default function RevolvrChatFeed() {
  const [messages, setMessages] = useState<Message[]>([]);

  // Simulated feed for now
  useEffect(() => {
    const interval = setInterval(() => {
      const id = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        {
          id,
          user: "user" + Math.floor(Math.random() * 100),
          text: "Revolvr LIVE is different 🔥",
        },
      ]);

      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, 14000);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute left-4 bottom-[28%] w-[min(85%,360px)] z-40 pointer-events-none space-y-4">
      <AnimatePresence>
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            initial={{ x: -60, y: 12, opacity: 0, scale: 0.95 }}
            animate={{
              x: 0,
              y: -40 - index * 4,
              opacity: [0, 1, 1, 0],
              scale: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 14,
              ease: "easeOut",
            }}
            className="backdrop-blur-md bg-white/10 border border-white/15 rounded-2xl px-4 py-3 shadow-xl"
          >
            <div className="text-emerald-400 text-xs font-semibold">
              {msg.user}
            </div>
            <div className="text-white text-sm leading-snug">
              {msg.text}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
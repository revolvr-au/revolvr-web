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

  useEffect(() => {
    const interval = setInterval(() => {
      const id = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        {
          id,
          user: "user" + Math.floor(Math.random() * 100),
          text: "Revolvr LIVE energy 🔥",
        },
      ]);

      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, 14000);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="absolute left-4 bottom-[28%] w-[min(85%,360px)] z-40 pointer-events-none space-y-4 overflow-hidden"
      style={{
        maskImage: "linear-gradient(to top, black 80%, transparent 100%)",
      }}
    >
      <AnimatePresence>
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            initial={{ x: -40, y: 8, opacity: 0, scale: 0.97 }}
            animate={{
              x: 0,
              y: -60 - index * 8,
              opacity: [0, 1, 0.8, 0],
              scale: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{
            duration: 9,
            ease: [0.22, 1, 0.36, 1], // custom cubic-bezier (premium ease)
            }}
            className="relative backdrop-blur-md bg-white/10 border border-white/15 rounded-2xl px-4 py-3 shadow-xl overflow-hidden"
          >
            {/* Arrival energy pulse */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0] }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 bg-emerald-400/10 rounded-2xl blur-xl"
            />

            <div className="text-emerald-400 text-xs font-semibold relative z-10">
              {msg.user}
            </div>
            <div className="text-white text-sm leading-snug relative z-10">
              {msg.text}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function RevolvrComposer() {
  const [value, setValue] = useState("");

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="absolute left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-50"
    >
      <div className="flex items-center gap-3 backdrop-blur-xl bg-white/10 border border-white/15 rounded-full px-4 py-3 shadow-2xl">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Say something..."
          className="flex-1 bg-transparent text-white placeholder-white/50 focus:outline-none text-sm"
        />

        <button className="text-white/60 hover:text-white transition">
          😊
        </button>

        <button className="bg-emerald-500 hover:bg-emerald-400 transition text-black font-semibold text-sm px-4 py-2 rounded-full">
          Send
        </button>
      </div>
    </motion.div>
  );
}
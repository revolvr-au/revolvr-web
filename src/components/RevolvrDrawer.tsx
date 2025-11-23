"use client";

import { AnimatePresence, motion } from "framer-motion";
import React from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function RevolvrDrawer({ open, onClose, children, title }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* BACKDROP */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* DRAWER PANEL */}
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed top-0 right-0 h-full w-[380px] bg-neutral-900 text-white shadow-2xl z-50 flex flex-col border-l border-neutral-800"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <h2 className="text-lg font-semibold">{title || "Edit Item"}</h2>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* CONTENT */}
            <div className="p-4 overflow-y-auto flex-1">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

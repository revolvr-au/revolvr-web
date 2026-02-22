"use client";

import { useState } from "react";

type Props = {
  onClose: () => void;
  onStart: () => void;
  profileImage?: string;
};

export default function LiveStartOverlay({
  onClose,
  onStart,
  profileImage,
}: Props) {
  const [starting, setStarting] = useState(false);

  const handleStart = () => {
    setStarting(true);
    setTimeout(() => {
      onStart();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">

      {profileImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl scale-110"
          style={{ backgroundImage: `url(${profileImage})` }}
        />
      )}

      <div className="relative z-10 w-[90%] max-w-md rounded-3xl border border-red-500/20 bg-[#0b0f1a]/95 p-8 text-center shadow-2xl">

        <div className="text-2xl font-semibold text-white tracking-wide">
          You're going
        </div>

        <div className="mt-2 text-4xl font-bold text-red-500 animate-pulse">
          LIVE
        </div>

        <button
          onClick={handleStart}
          disabled={starting}
          className="mt-8 w-full rounded-2xl bg-red-500 py-4 text-lg font-semibold text-white transition hover:scale-105 active:scale-95"
        >
          {starting ? "Starting..." : "Start Broadcast"}
        </button>

        <button
          onClick={onClose}
          className="mt-4 text-sm text-white/50 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
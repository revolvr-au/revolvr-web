"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import LiveKitClient from "./LiveKitClient";

type Comment = {
  id: string;
  user: string;
  text: string;
  createdAt: number;
};

export default function LiveClient({
  token,
  lkUrl,
  isMobile,
  isHost,
}: {
  token: string;
  lkUrl: string;
  isMobile: boolean;
  isHost: boolean;
}) {
  const router = useRouter();

  const [comments, setComments] = useState<Comment[]>([]);
  const [viewerCount] = useState(174);
  const [heartBurst, setHeartBurst] = useState(false);

  const lastTapRef = useRef(0);

  // Demo comments (temporary)
  useEffect(() => {
    const interval = setInterval(() => {
      setComments((prev) => {
        const next = [
          ...prev,
          {
            id: crypto.randomUUID(),
            user: "User" + Math.floor(Math.random() * 100),
            text: "🔥 Loving this",
            createdAt: Date.now(),
          },
        ];
        return next.slice(-4);
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 600);
    }
    lastTapRef.current = now;
  }

  return (
    <div className="relative w-screen h-[100dvh] bg-black overflow-hidden">

      {/* VIDEO LAYER */}
      <div className="absolute inset-0" onClick={handleTap}>
        <LiveKitClient
          token={token}
          lkUrl={lkUrl}
          isMobile={isMobile}
          onlySubscribed={!isHost}
        />
      </div>

      {/* TOP BAR */}
      <div className="absolute top-4 left-4 flex items-center gap-3 text-white z-20">
        <div className="w-10 h-10 rounded-full bg-white/20" />
        <div>
          <div className="font-semibold">revolvr au</div>
          <div className="text-xs opacity-70">
            LIVE · {viewerCount} watching
          </div>
        </div>
      </div>

      {/* CLOSE */}
      <button
        onClick={() => router.push("/public-feed")}
        className="absolute top-4 right-4 text-white text-lg z-20"
      >
        ✕
      </button>

      {/* LEFT FLOATING COMMENTS */}
      <div className="absolute left-4 bottom-28 flex flex-col gap-2 pointer-events-none z-20">
        {comments.map((c) => (
          <div
            key={c.id}
            className="text-white text-sm animate-fadeUp"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
          >
            <span className="font-semibold">{c.user}</span> {c.text}
          </div>
        ))}
      </div>

      {/* RIGHT ACTION STACK */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 text-white z-20">
        <button className="text-3xl">❤️</button>
        <button className="text-3xl">💬</button>
        <button className="text-3xl">🎁</button>
        <button className="text-3xl">↗</button>
      </div>

      {/* BOTTOM COMMENT BAR */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/80 to-transparent z-20">
        <div className="flex items-center gap-3 text-white">
          <input
            placeholder="Add a comment..."
            className="flex-1 bg-white/10 rounded-full px-4 py-2 text-sm outline-none"
          />
          <button>🙂</button>
          <button>🎁</button>
        </div>
      </div>

      {/* HEART BURST */}
      {heartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="text-red-500 text-6xl animate-heartPop">
            ❤️
          </div>
        </div>
      )}
    </div>
  );
}
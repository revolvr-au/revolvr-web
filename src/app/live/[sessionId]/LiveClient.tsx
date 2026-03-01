"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const LiveKitClient = dynamic(() => import("./LiveKitClient"), { ssr: false });

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
  const [message, setMessage] = useState("");

  const lastTapRef = useRef(0);

  // Demo floating comments (temporary)
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
      triggerHeart();
    }
    lastTapRef.current = now;
  }

  function triggerHeart() {
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 600);
  }

  function handleSend() {
    if (!message.trim()) return;

    setComments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        user: "You",
        text: message,
        createdAt: Date.now(),
      },
    ]);

    setMessage("");
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
      <div className="absolute top-4 left-4 flex items-start gap-3 text-white z-40">
        <div className="w-10 h-10 rounded-full bg-white/20" />

        <div className="leading-tight">
          <div className="font-semibold text-sm">revolvr au</div>

          <div className="text-xs opacity-90 mt-1">
            <span className="mr-2">🔴 LIVE</span>
            <span className="font-semibold">{viewerCount}</span>{" "}
            <span className="opacity-70">watching</span>
          </div>
        </div>
      </div>

      {/* FOLLOW + CLOSE */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-40">
        <button className="text-xs px-3 py-1 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm">
          + Follow
        </button>

        <button
          onClick={() => router.push("/public-feed")}
          className="text-white text-lg"
        >
          ✕
        </button>
      </div>

      {/* FLOATING COMMENTS */}
      <div className="absolute left-4 bottom-28 flex flex-col gap-2 pointer-events-none z-30">
        {comments.map((c) => (
          <div
            key={c.id}
            className="text-white text-sm animate-fadeUp"
            style={{
              textShadow: "0 1px 6px rgba(0,0,0,0.7)",
            }}
          >
            <span className="font-semibold">{c.user}</span>{" "}
            {c.text}
          </div>
        ))}
      </div>

      {/* COMMENT BAR */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/80 to-transparent z-40">
        <div className="flex items-center gap-3 text-white">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-white/10 rounded-full px-4 py-2 text-sm outline-none"
          />

          <button className="text-lg opacity-80">🙂</button>

          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className={`text-lg ${
              message.trim() ? "opacity-100" : "opacity-30"
            }`}
          >
            ➤
          </button>
        </div>
      </div>

      {/* HEART BURST */}
      {heartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-red-500 text-6xl animate-heartPop">
            ❤️
          </div>
        </div>
      )}
    </div>
  );
}
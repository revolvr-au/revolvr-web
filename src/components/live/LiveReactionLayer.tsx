"use client";

import { useState } from "react";

type Spark = {
  id: string;
  x: number;
  y: number;
};

type FloatHeart = {
  id: string;
  side: "left" | "right";
};

export default function LiveReactionLayer() {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [hearts, setHearts] = useState<FloatHeart[]>([]);

  const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const id = crypto.randomUUID();

    setSparks((prev) => [...prev, { id, x, y }]);

    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => s.id !== id));
    }, 600);

    // 1 in 3 taps spawn floating heart
    if (Math.random() < 0.33) {
      const heartId = crypto.randomUUID();
      const side = Math.random() < 0.5 ? "left" : "right";

      setHearts((prev) => [...prev, { id: heartId, side }]);

      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 3000);
    }
  };

  return (
    <div
      className="absolute inset-0 z-30"
      onDoubleClick={handleDoubleTap}
    >
      {/* Micro Sparks */}
      {sparks.map((spark) => (
        <div
          key={spark.id}
          className="absolute animate-spark"
          style={{
            left: spark.x,
            top: spark.y,
          }}
        >
          <div className="w-6 h-6 rounded-full bg-white/70 blur-sm" />
        </div>
      ))}

      {/* Floating Hearts */}
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className={`absolute bottom-8 ${
            heart.side === "left" ? "left-8" : "right-8"
          } animate-floatHeart text-white/60 text-xl`}
        >
          ♥
        </div>
      ))}
    </div>
  );
}
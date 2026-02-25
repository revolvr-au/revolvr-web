"use client";

import { useEffect, useState } from "react";

type Heart = {
  id: number;
  x: number;
};

export default function LiveReactionLayer() {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    const handleDoubleTap = (e: TouchEvent | MouseEvent) => {
      const x =
        "touches" in e && e.touches[0]
          ? e.touches[0].clientX
          : (e as MouseEvent).clientX;

      const newHeart = {
        id: Date.now(),
        x,
      };

      setHearts((prev) => [...prev, newHeart]);

      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
      }, 2000);
    };

    window.addEventListener("dblclick", handleDoubleTap);
    window.addEventListener("touchstart", handleDoubleTap);

    return () => {
      window.removeEventListener("dblclick", handleDoubleTap);
      window.removeEventListener("touchstart", handleDoubleTap);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute text-red-500 text-3xl animate-floatUp"
          style={{ left: heart.x }}
        >
          ❤️
        </div>
      ))}
    </div>
  );
}
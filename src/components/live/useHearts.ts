import { useState } from "react";

export function useHearts() {
  const [hearts, setHearts] = useState([]);

  function spawnHeart() {
    const id = crypto.randomUUID();

    const heart = {
      id,
      leftOffset: Math.random() * 30,
    };

    setHearts(prev => [...prev, heart]);

    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== id));
    }, 3000);
  }

  return { hearts, spawnHeart };
}
import { useHearts } from "./useHearts";

export default function HeartStream() {
  const { hearts } = useHearts();

  return (
    <div className="absolute right-6 bottom-32 z-25 pointer-events-none">
      {hearts.map(heart => (
        <div
          key={heart.id}
          className="absolute animate-heart text-pink-500 text-xl"
          style={{ right: `${heart.leftOffset}px` }}
        >
          ❤️
        </div>
      ))}
    </div>
  );
}
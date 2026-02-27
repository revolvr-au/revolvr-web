import { useHearts } from "./useHearts";

export default function BottomBar() {
  const { spawnHeart } = useHearts();

  return (
    <div className="absolute bottom-4 left-4 right-4 z-40">
      <div className="flex items-center gap-3 bg-black/50 backdrop-blur-xl rounded-2xl px-3 py-2 text-white">

        <button className="px-3 py-2 rounded-full bg-white/10">
          Leave
        </button>

        <input
          placeholder="Say something..."
          className="flex-1 bg-transparent outline-none px-3"
        />

        <button onClick={spawnHeart} className="text-xl">
          ❤️
        </button>

        <button className="text-xl">
          🎁
        </button>

        <button className="text-xl">
          ➤
        </button>
      </div>
    </div>
  );
}
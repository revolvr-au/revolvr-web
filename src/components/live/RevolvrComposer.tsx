export default function RevolvrComposer() {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md px-3 py-2">
      <input
        placeholder="Say something..."
        className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
      />

      <button className="text-xl">😊</button>
      <button className="text-xl">🎁</button>
      <button className="text-white">➤</button>
    </div>
  );
}
"use client";

type Props = {
  creatorName: string;
  sessionId: string;
  onJoin: (sessionId: string) => void;
};

export default function LiveCard({
  creatorName,
  sessionId,
  onJoin,
}: Props) {
  return (
    <div
      onClick={() => onJoin(sessionId)}
      className="
        relative mb-6 cursor-pointer rounded-2xl
        overflow-hidden
        border border-red-500/30
        bg-gradient-to-br from-red-500/10 via-black/40 to-black/60
        backdrop-blur-xl
        p-6
        transition
        hover:border-red-500/50
        hover:shadow-[0_0_60px_rgba(255,0,85,0.35)]
        active:scale-[0.99]
      "
    >
      {/* Glow background pulse */}
      <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="text-lg font-semibold tracking-wide">
          {creatorName}
          <span className="ml-2 text-white/70">is</span>
          <span className="ml-2 text-red-500 font-bold animate-pulse">
            LIVE
          </span>
        </div>

        <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
      </div>

      <div className="relative z-10 mt-3 text-sm text-white/60">
        Tap to watch instantly
      </div>
    </div>
  );
}
"use client";

type Props = {
  voltage: number;
  interactions: number;
  comments: number;
  momentum: number;
};

export default function CreatorPanel({
  voltage,
  interactions,
  comments,
  momentum,
}: Props) {
  const momentumState =
    momentum > 3 ? "Rising" : momentum > 1 ? "Stable" : "Cooling";

  return (
    <div className="absolute top-4 left-4 z-30 w-[140px] rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white backdrop-blur-md">
      <div className="mb-2 font-semibold text-white/90">
        Performance
      </div>

      <div className="flex justify-between">
        <span className="text-white/60">Voltage</span>
        <span className="font-semibold">{Math.round(voltage)}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-white/60">Activity</span>
        <span>{interactions}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-white/60">Comments</span>
        <span>{comments}</span>
      </div>

      <div className="mt-1 flex justify-between">
        <span className="text-white/60">Momentum</span>
        <span className="font-semibold">{momentumState}</span>
      </div>
    </div>
  );
}

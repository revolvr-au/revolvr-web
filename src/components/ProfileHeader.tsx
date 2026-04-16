"use client";

type Props = {
  name: string;
  totalVoltage: number;
  recentVoltage: number;
  postCount: number;
};

export default function ProfileHeader({
  name,
  totalVoltage,
  recentVoltage,
  postCount,
}: Props) {
  const momentumState =
    totalVoltage > 0 && recentVoltage > totalVoltage * 0.2 ? "Rising" : "Stable";

  return (
    <div className="px-4 py-5 text-white">
      <div className="text-lg font-semibold tracking-wide">{name}</div>

      <div className="mt-3 flex gap-6 text-sm text-white/70">
        <div>
          <div className="font-semibold text-white">{Math.round(totalVoltage)}</div>
          <div>Voltage</div>
        </div>

        <div>
          <div className="font-semibold text-white">{postCount}</div>
          <div>Posts</div>
        </div>

        <div>
          <div className="font-semibold text-white">{momentumState}</div>
          <div>Momentum</div>
        </div>
      </div>

      {momentumState === "Rising" && (
        <div className="mt-2 text-xs text-white/50">gaining attention</div>
      )}
    </div>
  );
}

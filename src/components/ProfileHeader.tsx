"use client";

type Props = {
  name: string;
  totalVoltage: number;
  recentVoltage: number;
  postCount: number;
};

export default function ProfileHeader({ name, totalVoltage, recentVoltage, postCount }: Props) {
  const momentumState = totalVoltage > 0 && recentVoltage > totalVoltage * 0.2 ? "Rising" : "Stable";

  return (
    <div style={{ textAlign: "center", color: "white" }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>{name}</div>

      <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{Math.round(totalVoltage)}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "monospace", letterSpacing: 1 }}>VOLTAGE</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{postCount}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "monospace", letterSpacing: 1 }}>POSTS</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{momentumState}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "monospace", letterSpacing: 1 }}>MOMENTUM</div>
        </div>
      </div>

      {momentumState === "Rising" && (
        <div style={{ marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
          gaining attention
        </div>
      )}
    </div>
  );
}
import type { ReactNode } from "react";

export const RING_COLORS: Record<string, string> = {
  BLUE: "#3B82F6",
  GOLD: "#F59E0B",
  BUSINESS: "#8B5CF6",
  CORPORATE: "#6366F1",
  RED: "#EF4444",
  GOVERNMENT: "#10B981",
};

export function getRingColor(tier?: string | null): string | null {
  return tier && tier !== "NONE" ? (RING_COLORS[tier] ?? null) : null;
}

export default function RingRim({
  tier,
  size,
  children,
}: {
  tier?: string | null;
  size: number;
  children: ReactNode;
}) {
  const color = getRingColor(tier);
  if (!color) return <>{children}</>;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        boxShadow: `0 0 0 2.5px ${color}, 0 0 10px ${color}50`,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

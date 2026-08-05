import type { ReactNode } from "react";

// Ring tiers are the one place Revolvr's "gold" is an actual gold. The app-wide
// GOLD accent token is #ffffff (declared in TopBar, PublicFeedClient,
// notifications, TrancheContent, GathWindow, GathRoomClient, ControlPanel and
// PeopleCard); a paid tier called Gold Ring needs to read as gold, so this
// deliberately diverges. Keep in sync with RING_DISPLAY in me/MeClient.tsx.
export const RING_COLORS: Record<string, string> = {
  BLUE: "#3B82F6",
  GOLD: "#FACC15",
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

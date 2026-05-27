export type RingTier =
  | "NONE"
  | "BLUE"
  | "GOLD"
  | "BUSINESS"
  | "CORPORATE"
  | "RED"
  | "GOVERNMENT";

const TIER_RANK: Record<RingTier, number> = {
  NONE:       0,
  BLUE:       1,
  GOLD:       2,
  BUSINESS:   3,
  CORPORATE:  4,
  RED:        5,
  GOVERNMENT: 6,
};

export function hasRing(
  userTier: string | null | undefined,
  requiredTier: RingTier,
): boolean {
  const rank = TIER_RANK[(userTier as RingTier) ?? "NONE"] ?? 0;
  return rank >= TIER_RANK[requiredTier];
}

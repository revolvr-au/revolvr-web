// Single source of truth for the creator's share of a gift, by ring tier.
//
// Read by /api/live/gift and /api/battle/gifts — the only two paths that credit
// creatorBalance. The percentages published on /rings must match this map.
//
// RED and GOVERNMENT are deliberately absent. Neither is purchasable or listed,
// so a manually granted holder falls through to DEFAULT_PAYOUT_RATE (the same
// share as no ring at all). Add them here before either tier goes into use.
export const RING_PAYOUT: Record<string, number> = {
  NONE:      0.18,
  BLUE:      0.30,
  GOLD:      0.50,
  BUSINESS:  0.65,
  CORPORATE: 0.65,
};

export const DEFAULT_PAYOUT_RATE = 0.18;

export function payoutRateFor(ringTier: string | null | undefined): number {
  return RING_PAYOUT[ringTier ?? "NONE"] ?? DEFAULT_PAYOUT_RATE;
}

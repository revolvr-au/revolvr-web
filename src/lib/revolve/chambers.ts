// src/lib/revolve/chambers.ts
//
// Phase 3 — the positional grammar of the revolve overlay. PURE DATA, no React, so the
// layout/collapse rules can be reasoned about (and unit-tested) on their own.
//
// The six chambers sit at FIXED clock positions. Positions never rebalance: when supply is
// thin (chamberCount 4 or 5) we DROP a slot and leave its angular gap — never filler, never
// a redistribution. Deeper is always present and always at the bottom (6 o'clock).
//
//          Surging (12)
//   New-blood (10)   Live (2)
//   Wildcard (8)     Clash (4)
//          Deeper (6)
//
// Drop order (lowest priority dropped first):
//   6 → all · 5 → drop Wildcard (gap lower-left) · 4 → drop Wildcard + Clash (symmetric diamond)

export type ChamberSlot =
  | "surging"
  | "live"
  | "clash"
  | "deeper"
  | "wildcard"
  | "newblood";

export type ChamberPlacement = {
  slot: ChamberSlot;
  /** Human-facing label for the labeled-skeleton placeholders. */
  label: string;
  /** Degrees clockwise from top (12 o'clock = 0). */
  angle: number;
  /** Unit vector from centre toward the slot. Multiply by a radius (CSS length) to place. */
  ux: number;
  uy: number;
};

/** Fixed angular grammar — the single source of truth for where each slot lives. */
const GRAMMAR: Record<ChamberSlot, { label: string; angle: number }> = {
  surging: { label: "Surging", angle: 0 },
  live: { label: "Live", angle: 60 },
  clash: { label: "Clash", angle: 120 },
  deeper: { label: "Deeper", angle: 180 },
  wildcard: { label: "Wildcard", angle: 240 },
  newblood: { label: "New-blood", angle: 300 },
};

// Kept order, highest priority first. Take the first N as chamberCount shrinks.
// Deeper + Surging are the vertical anchors and are never dropped.
const PRIORITY: ChamberSlot[] = [
  "deeper",
  "surging",
  "live",
  "newblood",
  "clash",
  "wildcard",
];

function unitVector(angle: number): { ux: number; uy: number } {
  const rad = (angle * Math.PI) / 180;
  // 0° = up, so y is negative at the top.
  return { ux: Math.sin(rad), uy: -Math.cos(rad) };
}

/**
 * Resolve the chambers present at a given count, each with its FIXED grammar position.
 * Returns at most `count` placements; positions come straight from GRAMMAR regardless of
 * how many survive (a dropped slot is simply absent — the angular gap is intentional).
 */
export function chambersForCount(count: number): ChamberPlacement[] {
  const n = Math.min(PRIORITY.length, Math.max(0, Math.round(count)));
  const present = new Set(PRIORITY.slice(0, n));
  // Render in a stable visual order (clockwise from top) so stagger delays read naturally.
  return (Object.keys(GRAMMAR) as ChamberSlot[])
    .filter((slot) => present.has(slot))
    .sort((a, b) => GRAMMAR[a].angle - GRAMMAR[b].angle)
    .map((slot) => {
      const { label, angle } = GRAMMAR[slot];
      const { ux, uy } = unitVector(angle);
      return { slot, label, angle, ux, uy };
    });
}

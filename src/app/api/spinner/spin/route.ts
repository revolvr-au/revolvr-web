import { NextResponse } from "next/server";

type Reward = {
  label: string;
  weight: number;
  kind:
    | "highlight"
    | "extra_spin"
    | "badge"
    | "reactions"
    | "future_perk"
    | "none";
};

// Revolvr perks – framed as *community features*, not cash or jackpots.
// You can tweak labels + weights any time.
const rewards: Reward[] = [
  {
    label: "⭐ Highlight your next post for 24 hours",
    weight: 5,
    kind: "highlight",
  },
  {
    label: "🎁 Extra Revolvr spin token (coming soon)",
    weight: 10,
    kind: "extra_spin",
  },
  {
    label: "🔥 Featured supporter badge for 48 hours",
    weight: 8,
    kind: "badge",
  },
  {
    label: "💬 Unlock the full reaction pack for 24 hours",
    weight: 12,
    kind: "reactions",
  },
  {
    label: "✨ Early access slot for the next Revolvr experiment",
    weight: 7,
    kind: "future_perk",
  },
  {
    label:
      "🙂 No new perk this time — but your spin still helps keep Revolvr running",
    weight: 40,
    kind: "none",
  },
  {
    label: "🌟 Creator spotlight nomination token",
    weight: 3,
    kind: "highlight",
  },
];

function weightedRandom(list: Reward[]): Reward {
  const total = list.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * total;

  for (const reward of list) {
    roll -= reward.weight;
    if (roll <= 0) return reward;
  }
  // Fallback – should never really hit
  return list[0];
}

export async function POST() {
  const reward = weightedRandom(rewards);

  return NextResponse.json({
    success: true,
    result: reward.label,
    kind: reward.kind,
  });
}

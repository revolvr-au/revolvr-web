// src/lib/spinner.ts

// All possible results from the Revolvr spinner
export type SpinnerOutcomeId =
  | "small_boost"
  | "medium_boost"
  | "profile_highlight"
  | "mega_boost"
  | "extra_credits"
  | "tiny_boost";

export type SpinnerOutcome = {
  id: SpinnerOutcomeId;
  label: string;
  description: string;
  weight: number; // used for probability
};

// The reward table (you can tweak labels/descriptions later)
export const SPINNER_OUTCOMES: SpinnerOutcome[] = [
  {
    id: "small_boost",
    label: "Small Boost",
    description: "You won 1 boost token!",
    weight: 40,
  },
  {
    id: "medium_boost",
    label: "Medium Boost",
    description: "You won 2 boost tokens!",
    weight: 20,
  },
  {
    id: "profile_highlight",
    label: "Profile Highlight",
    description: "Your profile is highlighted for 24 hours!",
    weight: 15,
  },
  {
    id: "mega_boost",
    label: "Mega Boost",
    description: "3 boost tokens and a 48h profile highlight!",
    weight: 5,
  },
  {
    id: "extra_credits",
    label: "Credit Refund",
    description: "You got your spin credits back!",
    weight: 10,
  },
  {
    id: "tiny_boost",
    label: "Mini Boost Fragment",
    description: "You got a half-boost fragment!",
    weight: 10,
  },
];

// Weighted random picker.
// This does NOT touch DB or auth. It's just pure logic.
export function pickSpinnerOutcome(): SpinnerOutcome {
  const totalWeight = SPINNER_OUTCOMES.reduce(
    (sum, outcome) => sum + outcome.weight,
    0
  );

  const rand = Math.random() * totalWeight;

  let cumulative = 0;
  for (const outcome of SPINNER_OUTCOMES) {
    cumulative += outcome.weight;
    if (rand < cumulative) {
      return outcome;
    }
  }

  // Fallback (should never happen)
  return SPINNER_OUTCOMES[0];
}

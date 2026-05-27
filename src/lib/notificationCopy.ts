import type { TrancheNotificationType } from "@prisma/client";

export const TRANCHE_NOTIFICATION_COPY: Record<TrancheNotificationType, string> = {
  BREAKOUT_AUTHOR:
    "⚡ Your comment just went TRANCHE. It broke out into the public feed. You earned this.",
  BREAKOUT_CREATOR:
    "⚡ A comment on your post just broke out into the TRANCHE feed.",
  WITNESS_EARLY:
    "👁 You witnessed this TRANCHE moment early — before it blew up.",
  STRUCK_OUT:
    "🚨 A TRANCHE moment you engaged with has been struck out for misinformation.",
  TFC_APPROVED:
    "✅ You're in. Your TFC Crew application was approved — your 90-day term starts now.",
  TFC_REJECTED:
    "❌ Your TFC Crew application wasn't approved this round.",
  SIN_BIN_1: "",
  SIN_BIN_2: "",
  COLLISION_DETECTED: "",
  GATH_SEEDED: "",
  SPONSORED: "",
  TFC_FILED: "",
  TFC_CLEARED: "",
  ORIGINATOR_PAYOUT: "",
};

export function trancheCopyFor(type: TrancheNotificationType): string {
  return TRANCHE_NOTIFICATION_COPY[type] ?? "";
}

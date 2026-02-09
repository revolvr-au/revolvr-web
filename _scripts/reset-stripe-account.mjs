import { prisma } from "../src/lib/prisma.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/reset-stripe-account.mjs <email>");
  process.exit(1);
}

await prisma.creatorProfile.update({
  where: { email: email.toLowerCase() },
  data: {
    stripeAccountId: null,
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false,
    stripeOnboardingStatus: "pending",
  },
});

console.log("Reset Stripe account fields for:", email);
await prisma.$disconnect();

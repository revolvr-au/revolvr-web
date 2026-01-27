import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/reset-stripe-account.ts <email>");
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

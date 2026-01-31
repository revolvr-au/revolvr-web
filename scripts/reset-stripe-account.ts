import { prisma } from "../src/lib/prisma";

async function main() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error("Usage: npx tsx scripts/reset-stripe-account.ts <email>");
    process.exit(1);
  }

  const email = emailArg.toLowerCase().trim();

  // auth.users.email is nullable in schema, so use findFirst
  const user = await prisma.users.findFirst({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user?.id) {
    console.error("No auth.users row found for:", email);
    process.exit(1);
  }

  await prisma.creators.update({
    where: { id: user.id },
    data: {
      stripe_account_id: null,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      stripe_onboarding_status: "not_started",
    },
  });

  console.log("Reset Stripe creator fields for:", email, "user_id:", user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

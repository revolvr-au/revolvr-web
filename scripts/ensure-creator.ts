import { prisma } from "../src/lib/prisma";

function displayNameFromEmail(email: string) {
  const handle = email.split("@")[0] || "Creator";
  return handle
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

async function main() {
  const emailArg = process.argv[2];
  const displayArg = process.argv[3];

  if (!emailArg) {
    console.error("Usage: npx tsx scripts/ensure-creator.ts <email> [displayName]");
    process.exit(1);
  }

  const email = String(emailArg).trim().toLowerCase();
  const displayName = (displayArg && String(displayArg).trim()) || displayNameFromEmail(email);

  const creator = await prisma.creatorProfile.upsert({
    where: { email },
    create: {
      email,
      displayName,
      // everything else can safely default from schema
      // payoutCurrency defaults to "aud"
      // payoutShare defaults to 45
      // status defaults to ACTIVE
      // updatedAt handled by @updatedAt
    },
    update: {
      // keep it minimal + safe; don’t overwrite existing profile values
      displayName: displayName || undefined,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      payoutCurrency: true,
      status: true,
      stripeAccountId: true,
      stripeOnboardingStatus: true,
    },
  });

  console.log("✅ CreatorProfile ensured:", creator);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

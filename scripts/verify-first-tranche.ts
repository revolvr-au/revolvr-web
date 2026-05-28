import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const COMMENT_ID = "230851cb-2f92-456b-9b02-14c78019ed0b";
const TRANCHE_EVENT_ID = "a0399191-992f-45d9-8798-8cc486268c5b";

async function main() {
  const c = await prisma.comment.findUnique({
    where: { id: COMMENT_ID },
    select: { voltage: true, tranched: true, tranchedAt: true, quietPeriodEndsAt: true },
  });
  const e = await prisma.trancheEvent.findUnique({
    where: { id: TRANCHE_EVENT_ID },
    select: {
      breakoutVoltage: true, postVoltageAtBreakout: true, voltageSharePct: true,
      timeToThresholdMs: true, peakVoltage: true, createdAt: true,
    },
  });
  const events = await prisma.commentVoltageEvent.count({
    where: { commentId: COMMENT_ID, actorEmail: { startsWith: "seed-", endsWith: "@revolvr.au" } },
  });
  const notifs = await prisma.trancheNotification.findMany({
    where: { trancheEventId: TRANCHE_EVENT_ID },
    select: { recipientEmail: true, type: true },
  });
  const cp = await prisma.creatorProfile.findUnique({
    where: { email: "westley@reallistr.com.au" },
    select: { voltage: true },
  });

  console.log("Comment:           ", c);
  console.log("TrancheEvent:      ", e);
  console.log("Seed volt events:  ", events);
  console.log("Notifications:     ", notifs);
  console.log("CreatorProfile vlt:", cp);
}

main().catch(console.error).finally(() => prisma.$disconnect());

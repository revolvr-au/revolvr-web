/**
 * Rolls back everything seed-first-tranche.ts wrote to prod.
 * Idempotent — safe to run more than once.
 *
 * Scope (only seed-NNN@revolvr.au actors against the Reallistr comment):
 *   - DELETE CommentVoltageEvent  WHERE commentId=$comment AND actorEmail LIKE 'seed-%@revolvr.au'
 *   - DELETE CreatorVoltageEvent  WHERE creatorEmail=$author AND actorEmail LIKE 'seed-%@revolvr.au' AND targetId=$comment
 *   - Decrement CreatorProfile.voltage by the points returned from the deleted CreatorVoltageEvent rows
 *   - Recompute Comment.voltage from remaining CommentVoltageEvent.points (so we don't clobber any real volts)
 *   - DELETE TrancheNotification rows for the TrancheEvent
 *   - DELETE TrancheEvent for this comment
 *   - UPDATE Comment SET tranched=false, tranchedAt=null, quietPeriodEndsAt=null
 *     (only if the now-recomputed voltage no longer meets the threshold)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMMENT_ID = "230851cb-2f92-456b-9b02-14c78019ed0b";
const POST_ID = "654294f3-f815-4878-9799-3f60cbf220be";
const CREATOR_EMAIL = "westley@reallistr.com.au";
const SEED_PATTERN = "seed-%@revolvr.au";

async function main() {
  console.log(`Rolling back synthetic volts for comment ${COMMENT_ID}...\n`);

  // 1. Find the seed CommentVoltageEvent rows so we know what we're deleting.
  const commentEvents = await prisma.commentVoltageEvent.findMany({
    where: {
      commentId: COMMENT_ID,
      actorEmail: { startsWith: "seed-", endsWith: "@revolvr.au" },
    },
    select: { id: true, points: true, actorEmail: true },
  });
  const commentPointsToRemove = commentEvents.reduce((s, e) => s + e.points, 0);
  console.log(`  CommentVoltageEvent: ${commentEvents.length} rows, ${commentPointsToRemove} pts total`);

  // 2. Find the seed CreatorVoltageEvent rows.
  const creatorEvents = await prisma.creatorVoltageEvent.findMany({
    where: {
      creatorEmail: CREATOR_EMAIL,
      actorEmail: { startsWith: "seed-", endsWith: "@revolvr.au" },
      targetId: COMMENT_ID,
    },
    select: { id: true, points: true },
  });
  const creatorPointsToRemove = creatorEvents.reduce((s, e) => s + e.points, 0);
  console.log(`  CreatorVoltageEvent: ${creatorEvents.length} rows, ${creatorPointsToRemove} pts total`);

  // 3. Find the TrancheEvent for this comment (if any).
  const trancheEvent = await prisma.trancheEvent.findUnique({
    where: { commentId: COMMENT_ID },
    select: { id: true },
  });
  if (trancheEvent) {
    const notifs = await prisma.trancheNotification.count({
      where: { trancheEventId: trancheEvent.id },
    });
    console.log(`  TrancheEvent:        ${trancheEvent.id} (${notifs} notifications)`);
  } else {
    console.log(`  TrancheEvent:        (none)`);
  }

  console.log(`\nApplying rollback...`);

  await prisma.$transaction(async (tx) => {
    // Delete seed comment voltage events
    if (commentEvents.length > 0) {
      await tx.commentVoltageEvent.deleteMany({
        where: { id: { in: commentEvents.map((e) => e.id) } },
      });
    }

    // Delete seed creator voltage events
    if (creatorEvents.length > 0) {
      await tx.creatorVoltageEvent.deleteMany({
        where: { id: { in: creatorEvents.map((e) => e.id) } },
      });
    }

    // Decrement creator profile voltage
    if (creatorPointsToRemove > 0) {
      await tx.creatorProfile.update({
        where: { email: CREATOR_EMAIL },
        data: { voltage: { decrement: creatorPointsToRemove } },
      });
    }

    // Recompute comment voltage from remaining events
    const remaining = await tx.commentVoltageEvent.aggregate({
      where: { commentId: COMMENT_ID, eventType: "VOLT_RECEIVED" },
      _sum: { points: true },
    });
    const newVoltage = remaining._sum.points ?? 0;

    // Delete tranche notifications + event if voltage no longer meets threshold
    const post = await tx.post.findUnique({
      where: { id: POST_ID },
      select: { voltage: true },
    });
    const share = (post?.voltage ?? 0) > 0 ? newVoltage / (post?.voltage ?? 1) : 0;
    const config = await tx.trancheConfig.findUnique({ where: { id: "singleton" } });
    const meets = config
      ? newVoltage >= config.absoluteVoltageFloor && share >= config.relativeVoltageShare
      : false;

    if (trancheEvent && !meets) {
      await tx.trancheNotification.deleteMany({
        where: { trancheEventId: trancheEvent.id },
      });
      await tx.trancheEvent.delete({ where: { id: trancheEvent.id } });
      await tx.comment.update({
        where: { id: COMMENT_ID },
        data: {
          voltage: newVoltage,
          tranched: false,
          tranchedAt: null,
          quietPeriodEndsAt: null,
        },
      });
    } else {
      // Just update voltage; keep tranche state if still qualifying (e.g. real volts pushed it over).
      await tx.comment.update({
        where: { id: COMMENT_ID },
        data: { voltage: newVoltage },
      });
    }

    console.log(`  Comment.voltage now: ${newVoltage}  (tranched=${meets ? "kept" : "cleared"})`);
  });

  console.log(`\nRollback complete.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

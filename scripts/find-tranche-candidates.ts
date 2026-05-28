/**
 * READ-ONLY: lists posts that could host the first TRANCHE breakout.
 * For each post, shows the most-volted non-tranched comment.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ABSOLUTE_FLOOR = 200;
  const RELATIVE_SHARE = 0.15;

  // Posts that have at least one non-tranched comment, ordered by recent activity.
  const posts = await prisma.post.findMany({
    where: {
      comments: { some: { tranched: false } },
    },
    orderBy: [{ voltage: "desc" }, { createdAt: "desc" }],
    take: 30,
    select: {
      id: true,
      userEmail: true,
      caption: true,
      voltage: true,
      createdAt: true,
      comments: {
        where: { tranched: false },
        orderBy: [{ voltage: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          id: true,
          userEmail: true,
          body: true,
          voltage: true,
          createdAt: true,
          tranched: true,
        },
      },
    },
  });

  console.log(`\nFound ${posts.length} candidate posts (top non-tranched comment shown each)\n`);
  console.log("=".repeat(100));

  let rank = 0;
  for (const p of posts) {
    const c = p.comments[0];
    if (!c) continue;
    rank++;

    const needAbs = Math.max(0, ABSOLUTE_FLOOR - c.voltage);
    // share = (c.voltage + N) / (p.voltage + N) >= 0.15  →  N >= (0.15*p - c)/(1 - 0.15) when c<0.15*p
    // But each volt only increments comment, NOT post. So:
    // share = (c.voltage + N) / p.voltage >= 0.15  →  N >= 0.15*p.voltage - c.voltage
    const needShare = Math.max(0, Math.ceil(RELATIVE_SHARE * p.voltage - c.voltage));
    const needed = Math.max(needAbs, needShare);

    console.log(`#${rank}  POST  ${p.id}`);
    console.log(`     author:   ${p.userEmail}`);
    console.log(`     voltage:  ${p.voltage}`);
    console.log(`     created:  ${p.createdAt.toISOString()}`);
    console.log(`     caption:  ${(p.caption ?? "").slice(0, 140).replace(/\n/g, " ⏎ ")}`);
    console.log(`     ─ COMMENT ${c.id}`);
    console.log(`        author:   ${c.userEmail}`);
    console.log(`        voltage:  ${c.voltage}`);
    console.log(`        created:  ${c.createdAt.toISOString()}`);
    console.log(`        body:     ${c.body.slice(0, 240).replace(/\n/g, " ⏎ ")}`);
    console.log(`     → volts needed to TRANCHE: ${needed}  (abs:${needAbs}, share:${needShare})`);
    console.log("-".repeat(100));
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

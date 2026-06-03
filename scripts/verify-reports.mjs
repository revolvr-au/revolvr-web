/**
 * READ-ONLY: lists the most recent rows in the Report table so you can confirm a
 * test report landed with the right reason / target / child-safety marker.
 *
 * Usage:
 *   node scripts/verify-reports.mjs           # latest 10 reports
 *   node scripts/verify-reports.mjs 25         # latest 25 reports
 *
 * Connects via DIRECT_URL (port 5432) to avoid pgbouncer prepared-statement quirks.
 * Performs SELECTs only — never writes.
 */
import { PrismaClient } from "@prisma/client";

const limit = Math.min(Math.max(parseInt(process.argv[2] ?? "10", 10) || 10, 1), 200);
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DIRECT_URL / DATABASE_URL in env.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  const total = await prisma.report.count();
  const rows = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  console.log(`Report rows: ${total} total — showing latest ${rows.length}\n`);

  for (const r of rows) {
    const csam = r.reason === "csam";
    const flag = csam ? "🚨 CSAM " : "       ";
    const when = r.createdAt.toISOString().replace("T", " ").slice(0, 19);
    console.log(`${flag}${when}  [${r.status}]  reason=${r.reason}`);
    console.log(`         target: ${r.targetType} / ${r.targetId}`);
    console.log(`         reporter: ${r.reporterEmail ?? "(anonymous)"}`);
    if (r.note) {
      const firstLine = r.note.split("\n")[0];
      console.log(`         note: ${firstLine}${r.note.includes("\n") ? " …" : ""}`);
    }
    if (csam && !(r.note ?? "").includes("CHILD SAFETY")) {
      console.log(`         ⚠️  expected child-safety banner missing from note`);
    }
    console.log(`         id: ${r.id}`);
    console.log("");
  }

  const csamCount = rows.filter((r) => r.reason === "csam").length;
  console.log(`Child-safety (csam) reports in this window: ${csamCount}`);
} catch (err) {
  console.error("Query failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

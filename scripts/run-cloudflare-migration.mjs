// One-time script: add cloudflareVideoId column to Post table
// Run with: node scripts/run-cloudflare-migration.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Applying Cloudflare video ID migration…");

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."Post" ADD COLUMN IF NOT EXISTS "cloudflareVideoId" TEXT;
    `);
    console.log("✓ cloudflareVideoId column added (or already exists)");
  } catch (e) {
    console.error("✗ column error:", e.message);
    throw e;
  }

  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "public"."_prisma_migrations"
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      SELECT
        gen_random_uuid()::text, 'manual', NOW(), '20260424000000_add_cloudflare_video_id', NULL, NULL, NOW(), 1
      WHERE NOT EXISTS (
        SELECT 1 FROM "public"."_prisma_migrations"
        WHERE migration_name = '20260424000000_add_cloudflare_video_id'
      );
    `);
    console.log("✓ Prisma migrations table updated");
  } catch (e) {
    console.log("  Could not write to _prisma_migrations (non-fatal):", e.message);
  }

  console.log("\nMigration complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

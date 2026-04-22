// One-time script: apply spark fields migration via Prisma client (query engine, not schema engine)
// Run with: node scripts/run-spark-migration.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Applying spark fields migration…");

  // 1. PostType enum — idempotent
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type
          WHERE typname = 'PostType'
            AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ) THEN
          CREATE TYPE "public"."PostType" AS ENUM ('FEED', 'SPARK', 'RAW', 'PODCAST');
        END IF;
      END $$;
    `);
    console.log("✓ PostType enum created (or already exists)");
  } catch (e) {
    console.error("Enum error:", e.message);
    throw e;
  }

  // 2. New columns on Post — idempotent via IF NOT EXISTS
  const columns = [
    {
      name: "postType",
      sql: `ALTER TABLE "public"."Post" ADD COLUMN IF NOT EXISTS "postType" "public"."PostType" NOT NULL DEFAULT 'FEED'`,
    },
    {
      name: "sparkEligible",
      sql: `ALTER TABLE "public"."Post" ADD COLUMN IF NOT EXISTS "sparkEligible" BOOLEAN NOT NULL DEFAULT false`,
    },
    {
      name: "voltage",
      sql: `ALTER TABLE "public"."Post" ADD COLUMN IF NOT EXISTS "voltage" INTEGER NOT NULL DEFAULT 0`,
    },
    {
      name: "expiresAt",
      sql: `ALTER TABLE "public"."Post" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)`,
    },
  ];

  for (const col of columns) {
    try {
      await prisma.$executeRawUnsafe(col.sql);
      console.log(`✓ ${col.name}`);
    } catch (e) {
      if (e.message.includes("already exists")) {
        console.log(`  ${col.name} already exists — skipped`);
      } else {
        console.error(`✗ ${col.name}:`, e.message);
        throw e;
      }
    }
  }

  // 3. Composite index for SPARK feed queries
  try {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Post_spark_voltage_idx"
        ON "public"."Post" ("sparkEligible", "voltage" DESC);
    `);
    console.log("✓ Post_spark_voltage_idx");
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.log("  Post_spark_voltage_idx already exists — skipped");
    } else {
      console.error("✗ index:", e.message);
      throw e;
    }
  }

  // 4. Mark migration as applied in Prisma's shadow table
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "public"."_prisma_migrations"
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      SELECT
        gen_random_uuid()::text, 'manual', NOW(), '20260422000000_add_post_spark_fields', NULL, NULL, NOW(), 1
      WHERE NOT EXISTS (
        SELECT 1 FROM "public"."_prisma_migrations"
        WHERE migration_name = '20260422000000_add_post_spark_fields'
      );
    `);
    console.log("✓ Prisma migrations table updated");
  } catch (e) {
    // Non-fatal — table may not exist or name column may differ
    console.log("  Could not write to _prisma_migrations (non-fatal):", e.message);
  }

  console.log("\nMigration complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

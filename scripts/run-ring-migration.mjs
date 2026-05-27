// One-time script: apply ring tier migration via Prisma client (query engine, not schema engine)
// Run with: node scripts/run-ring-migration.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Applying ring tier migration…");

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RingTier' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
          CREATE TYPE "public"."RingTier" AS ENUM ('NONE', 'BLUE', 'GOLD', 'BUSINESS', 'CORPORATE', 'RED', 'GOVERNMENT');
        END IF;
      END $$;
    `);
    console.log("✓ RingTier enum created (or already exists)");
  } catch (e) {
    console.error("Enum error:", e.message);
    throw e;
  }

  const columns = [
    {
      name: "ring_tier",
      sql: `ALTER TABLE "public"."CreatorProfile" ADD COLUMN IF NOT EXISTS "ring_tier" "public"."RingTier" NOT NULL DEFAULT 'NONE'`,
    },
    {
      name: "ring_activated_at",
      sql: `ALTER TABLE "public"."CreatorProfile" ADD COLUMN IF NOT EXISTS "ring_activated_at" TIMESTAMPTZ`,
    },
    {
      name: "ring_expires_at",
      sql: `ALTER TABLE "public"."CreatorProfile" ADD COLUMN IF NOT EXISTS "ring_expires_at" TIMESTAMPTZ`,
    },
    {
      name: "voltage_qualified",
      sql: `ALTER TABLE "public"."CreatorProfile" ADD COLUMN IF NOT EXISTS "voltage_qualified" BOOLEAN NOT NULL DEFAULT false`,
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

  console.log("\nMigration complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

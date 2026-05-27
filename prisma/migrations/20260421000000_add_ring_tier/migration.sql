-- CreateEnum
CREATE TYPE "public"."RingTier" AS ENUM ('NONE', 'BLUE', 'GOLD', 'BUSINESS', 'CORPORATE', 'RED', 'GOVERNMENT');

-- AlterTable: add ring verification fields to CreatorProfile
ALTER TABLE "public"."CreatorProfile"
  ADD COLUMN "ring_tier"         "public"."RingTier" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "ring_activated_at" TIMESTAMPTZ,
  ADD COLUMN "ring_expires_at"   TIMESTAMPTZ,
  ADD COLUMN "voltage_qualified" BOOLEAN NOT NULL DEFAULT false;

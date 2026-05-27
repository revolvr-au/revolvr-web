-- CreateEnum
CREATE TYPE "public"."PostType" AS ENUM ('FEED', 'SPARK', 'RAW', 'PODCAST');

-- AlterTable
ALTER TABLE "public"."Post"
  ADD COLUMN "postType"      "public"."PostType" NOT NULL DEFAULT 'FEED',
  ADD COLUMN "sparkEligible" BOOLEAN             NOT NULL DEFAULT false,
  ADD COLUMN "voltage"       INTEGER             NOT NULL DEFAULT 0,
  ADD COLUMN "expiresAt"     TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Post_spark_voltage_idx" ON "public"."Post"("sparkEligible", "voltage" DESC);

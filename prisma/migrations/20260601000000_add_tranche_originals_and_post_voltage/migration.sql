-- AlterEnum
ALTER TYPE "public"."PostType" ADD VALUE 'TRANCHE_ORIGINAL';

-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "live_viewer_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "original_variants" TEXT[];

-- CreateTable
CREATE TABLE "public"."post_voltage_events" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_voltage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_voltage_events_dedupeKey_key" ON "public"."post_voltage_events"("dedupeKey");

-- CreateIndex
CREATE INDEX "post_voltage_events_postId_idx" ON "public"."post_voltage_events"("postId");

-- CreateIndex
CREATE INDEX "post_voltage_events_actorEmail_idx" ON "public"."post_voltage_events"("actorEmail");

-- AddForeignKey
ALTER TABLE "public"."post_voltage_events" ADD CONSTRAINT "post_voltage_events_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;


/*
  Warnings:

  - You are about to drop the column `createdAt` on the `CreatorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CreatorProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripe_subscription_id]` on the table `CreatorProfile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `CreatorProfile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "creator_status" AS ENUM ('pending', 'active', 'suspended');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SupportKind" ADD VALUE 'REACTION';
ALTER TYPE "SupportKind" ADD VALUE 'VOTE';

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_postId_fkey";

-- AlterTable
ALTER TABLE "CreatorProfile" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "blue_tick_cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blue_tick_current_period_end" TIMESTAMPTZ(6),
ADD COLUMN     "blue_tick_customer_id" TEXT,
ADD COLUMN     "blue_tick_status" TEXT NOT NULL DEFAULT 'inactive',
ADD COLUMN     "blue_tick_sub_id" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creator_terms_accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creator_terms_accepted_at" TIMESTAMPTZ(6),
ADD COLUMN     "creator_terms_version" TEXT,
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payout_currency" TEXT NOT NULL DEFAULT 'aud',
ADD COLUMN     "stripe_account_id" TEXT,
ADD COLUMN     "stripe_charges_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_onboarding_status" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN     "stripe_payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verification_current_period_end" TIMESTAMPTZ(6),
ADD COLUMN     "verification_price_id" TEXT,
ADD COLUMN     "verification_status" TEXT NOT NULL DEFAULT 'inactive',
ADD COLUMN     "verified_since" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'image';

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerEmail" TEXT NOT NULL,
    "followingEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMedia" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "postId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_checkout_receipts" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "payment_intent" TEXT,
    "event_id" TEXT,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "amount_total" INTEGER,
    "currency" TEXT,
    "status" TEXT,
    "payment_status" TEXT,
    "customer_email" TEXT,
    "metadata" JSONB,
    "raw" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_checkout_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Follow_followerEmail_idx" ON "Follow"("followerEmail");

-- CreateIndex
CREATE INDEX "Follow_followingEmail_idx" ON "Follow"("followingEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerEmail_followingEmail_key" ON "Follow"("followerEmail", "followingEmail");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Comment_userEmail_createdAt_idx" ON "Comment"("userEmail", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PostMedia_postId_idx" ON "PostMedia"("postId");

-- CreateIndex
CREATE INDEX "PostMedia_postId_order_idx" ON "PostMedia"("postId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_checkout_receipts_session_id_key" ON "stripe_checkout_receipts"("session_id");

-- CreateIndex
CREATE INDEX "stripe_checkout_receipts_payment_intent_idx" ON "stripe_checkout_receipts"("payment_intent");

-- CreateIndex
CREATE INDEX "stripe_checkout_receipts_customer_email_idx" ON "stripe_checkout_receipts"("customer_email");

-- CreateIndex
CREATE INDEX "stripe_checkout_receipts_created_at_idx" ON "stripe_checkout_receipts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "creatorprofile_stripe_subscription_id_key" ON "CreatorProfile"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "creatorprofile_blue_tick_sub_id_idx" ON "CreatorProfile"("blue_tick_sub_id");

-- CreateIndex
CREATE INDEX "Like_postId_idx" ON "Like"("postId");

-- CreateIndex
CREATE INDEX "support_ledger_kind_idx" ON "SupportLedger"("kind");

-- CreateIndex
CREATE INDEX "supportledger_creator_kind_createdat_idx" ON "SupportLedger"("creatorEmail", "kind", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "supportledger_kind_createdat_idx" ON "SupportLedger"("kind", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "supportledger_kind_target_idx" ON "SupportLedger"("kind", "targetId");

-- CreateIndex
CREATE INDEX "supportledger_target_kind_idx" ON "SupportLedger"("targetId", "kind");

-- CreateIndex
CREATE INDEX "supportledger_viewer_kind_target_idx" ON "SupportLedger"("viewerEmail", "kind", "targetId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

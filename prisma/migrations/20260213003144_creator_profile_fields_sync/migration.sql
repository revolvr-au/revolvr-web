/*
  Warnings:

  - You are about to drop the `Block` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InnerChamberMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostViewEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StripeEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Thread` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripe_subscription_id]` on the table `CreatorProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SupportKind" ADD VALUE 'REACTION';
ALTER TYPE "SupportKind" ADD VALUE 'VOTE';

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_postId_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_postId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_threadId_fkey";

-- DropForeignKey
ALTER TABLE "PostMedia" DROP CONSTRAINT "PostMedia_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostViewEvent" DROP CONSTRAINT "PostViewEvent_postId_fkey";

-- DropIndex
DROP INDEX "Follow_followerEmail_idx";

-- DropIndex
DROP INDEX "Like_postId_userEmail_key";

-- DropIndex
DROP INDEX "PostMedia_postId_order_idx";

-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "blue_tick_cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blue_tick_current_period_end" TIMESTAMPTZ(6),
ADD COLUMN     "blue_tick_customer_id" TEXT,
ADD COLUMN     "blue_tick_status" TEXT NOT NULL DEFAULT 'inactive',
ADD COLUMN     "blue_tick_sub_id" TEXT,
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
ADD COLUMN     "verification_current_period_end" TIMESTAMPTZ(6),
ADD COLUMN     "verification_price_id" TEXT,
ADD COLUMN     "verification_status" TEXT NOT NULL DEFAULT 'inactive',
ADD COLUMN     "verified_since" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "PostMedia" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "order" DROP DEFAULT;

-- DropTable
DROP TABLE "Block";

-- DropTable
DROP TABLE "Comment";

-- DropTable
DROP TABLE "InnerChamberMember";

-- DropTable
DROP TABLE "Message";

-- DropTable
DROP TABLE "PostViewEvent";

-- DropTable
DROP TABLE "StripeEvent";

-- DropTable
DROP TABLE "Thread";

-- DropEnum
DROP TYPE "ThreadStatus";

-- CreateTable
CREATE TABLE "creator_profiles" (
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "display_name" TEXT,
    "handle" TEXT,
    "revenue_share" DECIMAL NOT NULL DEFAULT 0.45,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar_url" TEXT,
    "bio" TEXT,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "creators" (
    "id" UUID NOT NULL,
    "handle" CITEXT NOT NULL,
    "display_name" TEXT,
    "status" "creator_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripe_account_id" TEXT,
    "stripe_onboarding_status" TEXT NOT NULL DEFAULT 'not_started',
    "stripe_charges_enabled" BOOLEAN NOT NULL DEFAULT false,
    "stripe_payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "payout_currency" TEXT,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" TEXT NOT NULL,
    "user_id" UUID,
    "user_email" TEXT,
    "display_name" TEXT,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar_url" TEXT,

    CONSTRAINT "live_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_polls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "live_id" UUID NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "poll_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "choice" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paid_reactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "context_type" TEXT NOT NULL,
    "context_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paid_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "bio" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "spinner_spins" (
    "id" BIGSERIAL NOT NULL,
    "user_email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,

    CONSTRAINT "spinner_spins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_email_key" ON "creator_profiles"("email");

-- CreateIndex
CREATE INDEX "creator_profiles_user_id_idx" ON "creator_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "creators_handle_unique_idx" ON "creators"("handle");

-- CreateIndex
CREATE INDEX "creators_status_idx" ON "creators"("status");

-- CreateIndex
CREATE INDEX "creators_stripe_account_id_idx" ON "creators"("stripe_account_id");

-- CreateIndex
CREATE INDEX "live_chat_messages_room_created_idx" ON "live_chat_messages"("room_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "live_polls_live_unique" ON "live_polls"("live_id");

-- CreateIndex
CREATE INDEX "live_votes_poll_idx" ON "live_votes"("poll_id");

-- CreateIndex
CREATE INDEX "live_votes_user_idx" ON "live_votes"("user_id");

-- CreateIndex
CREATE INDEX "paid_reactions_context_idx" ON "paid_reactions"("context_type", "context_id");

-- CreateIndex
CREATE INDEX "paid_reactions_user_idx" ON "paid_reactions"("user_id");

-- CreateIndex
CREATE INDEX "spinner_spins_user_email_idx" ON "spinner_spins"("user_email");

-- CreateIndex
CREATE UNIQUE INDEX "creatorprofile_stripe_subscription_id_key" ON "CreatorProfile"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "creatorprofile_blue_tick_sub_id_idx" ON "CreatorProfile"("blue_tick_sub_id");

-- CreateIndex
CREATE INDEX "supportledger_creator_kind_createdat_idx" ON "SupportLedger"("creatorEmail", "kind", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "supportledger_kind_createdat_idx" ON "SupportLedger"("kind", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "supportledger_kind_target_idx" ON "SupportLedger"("kind", "targetId");

-- CreateIndex
CREATE INDEX "supportledger_target_kind_idx" ON "SupportLedger"("targetId", "kind");

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_votes" ADD CONSTRAINT "live_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "live_polls"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

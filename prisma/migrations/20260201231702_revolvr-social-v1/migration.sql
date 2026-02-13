-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ThreadStatus" AS ENUM ('REQUESTED', 'ACCEPTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- CreateEnum
DO $$ BEGIN
CREATE TYPE "RevolvrStatus" AS ENUM ('NEW', 'ACTIVE', 'WON', 'LOST');
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- CreateEnum
DO $$ BEGIN
CREATE TYPE "CreatorStatus" AS ENUM ('ACTIVE', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- CreateEnum
DO $$ BEGIN
CREATE TYPE "SupportKind" AS ENUM ('TIP', 'BOOST', 'SPIN', 'REACTION', 'VOTE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- CreateEnum
DO $$ BEGIN
CREATE TYPE "SupportSource" AS ENUM ('FEED', 'LIVE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- CreateEnum
DO $$ BEGIN
CREATE TYPE "creator_status" AS ENUM ('pending', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- CreateTable
CREATE TABLE IF NOT EXISTS "Post" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "earlyCommentUntil" TIMESTAMP(3),

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PostViewEvent" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "viewerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Follow" (
    "id" TEXT NOT NULL,
    "followerEmail" TEXT NOT NULL,
    "followingEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Block" (
    "id" TEXT NOT NULL,
    "blockerEmail" TEXT NOT NULL,
    "blockedEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InnerChamberMember" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "memberEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InnerChamberMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Thread" (
    "id" TEXT NOT NULL,
    "userAEmail" TEXT NOT NULL,
    "userBEmail" TEXT NOT NULL,
    "status" "ThreadStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Like" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PostMedia" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "postId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RevolvrItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "status" "RevolvrStatus" NOT NULL DEFAULT 'NEW',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "value" INTEGER,
    "name" TEXT NOT NULL,

    CONSTRAINT "RevolvrItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserCredits" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "boosts" INTEGER NOT NULL DEFAULT 0,
    "tips" INTEGER NOT NULL DEFAULT 0,
    "spins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CreatorBalance" (
    "creatorEmail" TEXT NOT NULL,
    "totalEarnedCents" INTEGER NOT NULL DEFAULT 0,
    "availableCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorBalance_pkey" PRIMARY KEY ("creatorEmail")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportLedger" (
    "id" TEXT NOT NULL,
    "creatorEmail" TEXT NOT NULL,
    "viewerEmail" TEXT,
    "kind" "SupportKind" NOT NULL,
    "source" "SupportSource" NOT NULL,
    "targetId" TEXT,
    "units" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "grossCents" INTEGER NOT NULL DEFAULT 0,
    "creatorCents" INTEGER NOT NULL DEFAULT 0,
    "platformCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "creatorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" TEXT NOT NULL,
    "amountGross" INTEGER NOT NULL,
    "amountCreator" INTEGER NOT NULL,
    "amountPlatform" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CreatorPayout" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "stripeTransferId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "stripe_checkout_receipts" (
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
CREATE INDEX IF NOT EXISTS "PostViewEvent_viewerEmail_createdAt_idx" ON "PostViewEvent"("viewerEmail", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PostViewEvent_postId_createdAt_idx" ON "PostViewEvent"("postId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Follow_followingEmail_idx" ON "Follow"("followingEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Follow_followerEmail_idx" ON "Follow"("followerEmail");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerEmail_followingEmail_key" ON "Follow"("followerEmail", "followingEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Block_blockedEmail_idx" ON "Block"("blockedEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Block_blockerEmail_idx" ON "Block"("blockerEmail");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Block_blockerEmail_blockedEmail_key" ON "Block"("blockerEmail", "blockedEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InnerChamberMember_ownerEmail_idx" ON "InnerChamberMember"("ownerEmail");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InnerChamberMember_ownerEmail_memberEmail_key" ON "InnerChamberMember"("ownerEmail", "memberEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_authorEmail_idx" ON "Comment"("authorEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Thread_status_idx" ON "Thread"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Thread_userAEmail_userBEmail_key" ON "Thread"("userAEmail", "userBEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_senderEmail_createdAt_idx" ON "Message"("senderEmail", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Like_postId_userEmail_key" ON "Like"("postId", "userEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PostMedia_postId_idx" ON "PostMedia"("postId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PostMedia_postId_order_idx" ON "PostMedia"("postId", "order");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserCredits_email_key" ON "UserCredits"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ledger_creator_idx" ON "SupportLedger"("creatorEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ledger_kind_idx" ON "SupportLedger"("kind");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ledger_target_idx" ON "SupportLedger"("targetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supportledger_viewer_kind_target_idx" ON "SupportLedger"("viewerEmail", "kind", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripeEventId_key" ON "Payment"("stripeEventId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "stripe_checkout_receipts_session_id_key" ON "stripe_checkout_receipts"("session_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stripe_checkout_receipts_payment_intent_idx" ON "stripe_checkout_receipts"("payment_intent");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stripe_checkout_receipts_customer_email_idx" ON "stripe_checkout_receipts"("customer_email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stripe_checkout_receipts_created_at_idx" ON "stripe_checkout_receipts"("created_at");


-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PostViewEvent"
    ADD CONSTRAINT "PostViewEvent_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Comment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Message"
    ADD CONSTRAINT "Message_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "Thread"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Like"
    ADD CONSTRAINT "Like_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PostMedia"
    ADD CONSTRAINT "PostMedia_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;


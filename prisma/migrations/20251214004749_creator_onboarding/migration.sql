-- CreateTable
CREATE TABLE "public"."CreatorProfile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "handle" TEXT,
    "payoutShare" INTEGER NOT NULL DEFAULT 45,
    "status" "public"."CreatorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CreatorBalance" (
    "creatorEmail" TEXT NOT NULL,
    "totalEarnedCents" INTEGER NOT NULL DEFAULT 0,
    "availableCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorBalance_pkey" PRIMARY KEY ("creatorEmail")
);

-- CreateTable
CREATE TABLE "public"."SupportLedger" (
    "id" TEXT NOT NULL,
    "creatorEmail" TEXT NOT NULL,
    "viewerEmail" TEXT,
    "kind" "public"."SupportKind" NOT NULL,
    "source" "public"."SupportSource" NOT NULL,
    "targetId" TEXT,
    "units" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "grossCents" INTEGER NOT NULL DEFAULT 0,
    "creatorCents" INTEGER NOT NULL DEFAULT 0,
    "platformCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_email_key" ON "public"."CreatorProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_handle_key" ON "public"."CreatorProfile"("handle");

-- CreateIndex
CREATE INDEX "SupportLedger_creatorEmail_idx" ON "public"."SupportLedger"("creatorEmail");

-- CreateIndex
CREATE INDEX "SupportLedger_viewerEmail_idx" ON "public"."SupportLedger"("viewerEmail");

-- CreateIndex
CREATE INDEX "SupportLedger_targetId_idx" ON "public"."SupportLedger"("targetId");

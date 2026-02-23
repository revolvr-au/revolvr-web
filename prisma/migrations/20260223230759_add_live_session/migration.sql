-- CreateTable
CREATE TABLE "public"."liveSession" (
    "id" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liveSession_pkey" PRIMARY KEY ("id")
);

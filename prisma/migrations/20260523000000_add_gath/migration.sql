-- CreateEnum
CREATE TYPE "public"."GathType" AS ENUM ('OPEN', 'PRIVATE', 'BUSINESS');

-- CreateEnum
CREATE TYPE "public"."GathStatus" AS ENUM ('PRELAUNCHING', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."GathRole" AS ENUM ('IGNITER', 'HOST', 'MEMBER');

-- CreateTable
CREATE TABLE "public"."Gath" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "type"         "public"."GathType" NOT NULL DEFAULT 'OPEN',
  "status"       "public"."GathStatus" NOT NULL DEFAULT 'ACTIVE',
  "creatorEmail" TEXT NOT NULL,
  "sparkCost"    INTEGER NOT NULL DEFAULT 0,
  "launchDate"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Gath_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Gath_creatorEmail_idx" ON "public"."Gath"("creatorEmail");

-- CreateIndex
CREATE INDEX "Gath_type_idx" ON "public"."Gath"("type");

-- CreateIndex
CREATE INDEX "Gath_status_idx" ON "public"."Gath"("status");

-- CreateTable
CREATE TABLE "public"."GathMember" (
  "id"        TEXT NOT NULL,
  "gathId"    TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "role"      "public"."GathRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GathMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GathMember_gathId_userEmail_key" ON "public"."GathMember"("gathId", "userEmail");

-- CreateIndex
CREATE INDEX "GathMember_userEmail_idx" ON "public"."GathMember"("userEmail");

-- AddForeignKey
ALTER TABLE "public"."GathMember"
  ADD CONSTRAINT "GathMember_gathId_fkey"
  FOREIGN KEY ("gathId") REFERENCES "public"."Gath"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."GathMessage" (
  "id"        TEXT NOT NULL,
  "gathId"    TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "voltage"   INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GathMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GathMessage_gathId_idx" ON "public"."GathMessage"("gathId");

-- AddForeignKey
ALTER TABLE "public"."GathMessage"
  ADD CONSTRAINT "GathMessage_gathId_fkey"
  FOREIGN KEY ("gathId") REFERENCES "public"."Gath"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."GathPost" (
  "id"       TEXT NOT NULL,
  "gathId"   TEXT NOT NULL,
  "postId"   TEXT NOT NULL,
  "seededAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GathPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GathPost_gathId_postId_key" ON "public"."GathPost"("gathId", "postId");

-- AddForeignKey
ALTER TABLE "public"."GathPost"
  ADD CONSTRAINT "GathPost_gathId_fkey"
  FOREIGN KEY ("gathId") REFERENCES "public"."Gath"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."Repost" (
  "id"        TEXT NOT NULL,
  "postId"    TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Repost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Repost_postId_userEmail_key" ON "public"."Repost"("postId", "userEmail");

-- CreateIndex
CREATE INDEX "Repost_userEmail_idx" ON "public"."Repost"("userEmail");

-- CreateIndex
CREATE INDEX "Repost_postId_idx" ON "public"."Repost"("postId");

-- AddForeignKey
ALTER TABLE "public"."Repost"
  ADD CONSTRAINT "Repost_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "public"."Post"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."SavedPost" (
  "id"        TEXT NOT NULL,
  "postId"    TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedPost_postId_userEmail_key" ON "public"."SavedPost"("postId", "userEmail");

-- CreateIndex
CREATE INDEX "SavedPost_userEmail_idx" ON "public"."SavedPost"("userEmail");

-- CreateIndex
CREATE INDEX "SavedPost_postId_idx" ON "public"."SavedPost"("postId");

-- AddForeignKey
ALTER TABLE "public"."SavedPost"
  ADD CONSTRAINT "SavedPost_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "public"."Post"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

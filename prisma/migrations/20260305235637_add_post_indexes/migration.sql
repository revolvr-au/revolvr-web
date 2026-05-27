-- CreateIndex
CREATE INDEX "Like_postId_idx" ON "public"."Like"("postId");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "public"."Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_userEmail_idx" ON "public"."Post"("userEmail");

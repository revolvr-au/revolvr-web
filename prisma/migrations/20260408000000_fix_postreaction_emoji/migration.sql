ALTER TABLE "public"."PostReaction" RENAME COLUMN "type" TO "emoji";
ALTER TABLE "public"."PostReaction" ADD CONSTRAINT "PostReaction_postId_userEmail_emoji_key" UNIQUE ("postId", "userEmail", "emoji");

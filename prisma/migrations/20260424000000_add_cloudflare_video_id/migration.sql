-- Add Cloudflare Stream video ID to Post
ALTER TABLE "public"."Post" ADD COLUMN IF NOT EXISTS "cloudflareVideoId" TEXT;

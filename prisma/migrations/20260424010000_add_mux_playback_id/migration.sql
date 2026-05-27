-- Add Mux playback ID to Post
ALTER TABLE "public"."Post" ADD COLUMN IF NOT EXISTS "muxPlaybackId" TEXT;

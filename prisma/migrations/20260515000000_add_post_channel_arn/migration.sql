-- Add IVS channel ARN to Post for stream cleanup tracking
ALTER TABLE "public"."Post" ADD COLUMN IF NOT EXISTS "channelArn" TEXT;

-- Align Prisma migration history with existing Supabase default
ALTER TABLE "public"."UserCredits"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

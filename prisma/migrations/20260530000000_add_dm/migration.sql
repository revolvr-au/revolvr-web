-- CreateEnum
CREATE TYPE "public"."ConvType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "public"."MsgType" AS ENUM ('TEXT', 'SYSTEM', 'GIFT');

-- AlterTable
ALTER TABLE "public"."profiles" ADD COLUMN "isMinor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."Conversation" (
  "id"            TEXT NOT NULL,
  "type"          "public"."ConvType" NOT NULL DEFAULT 'DIRECT',
  "directKey"     TEXT,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConversationParticipant" (
  "id"             TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userEmail"      TEXT NOT NULL,
  "lastReadAt"     TIMESTAMP(3),
  "muted"          BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
  "id"             TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderEmail"    TEXT NOT NULL,
  "body"           TEXT NOT NULL,
  "type"           "public"."MsgType" NOT NULL DEFAULT 'TEXT',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "editedAt"       TIMESTAMP(3),
  "deletedAt"      TIMESTAMP(3),
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_directKey_key" ON "public"."Conversation"("directKey");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "public"."Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userEmail_idx" ON "public"."ConversationParticipant"("userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userEmail_key" ON "public"."ConversationParticipant"("conversationId", "userEmail");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "public"."Message"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Raw SQL (not managed by Prisma): broadcast trigger, minor guard, RLS policy.
-- ─────────────────────────────────────────────────────────────────────────────

-- 3a. Broadcast trigger — fires on new message, broadcasts to the conversation's
-- private channel ('conversation:<id>'). Best-effort; Postgres remains source of truth.
CREATE OR REPLACE FUNCTION public.broadcast_dm_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'conversation:' || NEW."conversationId",  -- topic_name
    'new_message',                             -- event_name
    TG_OP,                                     -- operation
    TG_TABLE_NAME,                             -- table_name
    TG_TABLE_SCHEMA,                           -- table_schema
    NEW,                                       -- new record
    OLD                                        -- old record
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS broadcast_dm_message_trigger ON public."Message";
CREATE TRIGGER broadcast_dm_message_trigger
AFTER INSERT ON public."Message"
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_dm_message();

-- 3b. Minor invariant (defense in depth) — refuses to add a minor to any DIRECT
-- conversation, regardless of app-code bugs. Bound to the real age-gate field:
-- public."profiles"."isMinor", keyed by email (the app's canonical user identifier).
CREATE OR REPLACE FUNCTION public.block_minor_dm_participant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  is_minor  boolean;
  conv_type text;
BEGIN
  SELECT "isMinor" INTO is_minor FROM public."profiles" WHERE "email" = NEW."userEmail";
  SELECT type::text INTO conv_type FROM public."Conversation" WHERE "id" = NEW."conversationId";

  IF conv_type = 'DIRECT' AND COALESCE(is_minor, false) THEN
    RAISE EXCEPTION 'Minors cannot participate in direct messages';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_minor_dm_participant_trigger ON public."ConversationParticipant";
CREATE TRIGGER block_minor_dm_participant_trigger
BEFORE INSERT ON public."ConversationParticipant"
FOR EACH ROW
EXECUTE FUNCTION public.block_minor_dm_participant();

-- 3c. RLS — broadcast authorization. Lets an authenticated user RECEIVE broadcasts
-- only for conversations they participate in. Identity is mapped via the JWT email
-- claim (this app keys users by email, not auth.uid()).
-- Guarded: if the migration role lacks privilege on realtime.messages, the migration
-- still succeeds — run this block manually in the Supabase SQL editor as `postgres`.
DO $rls$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "dm: receive own conversation broadcasts" ON realtime.messages';
  EXECUTE $pol$
    CREATE POLICY "dm: receive own conversation broadcasts"
    ON realtime.messages
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public."ConversationParticipant" cp
        WHERE cp."conversationId" = split_part(realtime.topic(), ':', 2)
          AND lower(cp."userEmail") = lower((auth.jwt() ->> 'email'))
      )
    )
  $pol$;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped realtime.messages RLS policy (insufficient privilege). Run 3c manually as postgres.';
  WHEN undefined_table THEN
    RAISE NOTICE 'realtime.messages not found — Realtime may be disabled. Run 3c manually once enabled.';
END
$rls$;

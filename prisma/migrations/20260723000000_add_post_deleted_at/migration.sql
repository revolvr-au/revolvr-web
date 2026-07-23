-- Soft-delete support for Post: nullable timestamp, NULL = live, non-NULL = deleted.
ALTER TABLE "public"."Post" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Partial index: keeps the hot "live feed" read (ORDER BY createdAt DESC WHERE deleted_at IS NULL)
-- cheap without indexing dead rows.
CREATE INDEX "Post_deletedAt_null_createdAt_idx"
  ON "public"."Post" ("createdAt" DESC)
  WHERE "deleted_at" IS NULL;

-- IVS ingest credentials for a live broadcast.
--
-- These used to exist only in the browser URL (?key=...&ingest=...), which put a
-- live ingest credential into browser history, referrer headers and any URL
-- logging. They now live here and are served only to the post's owner.
--
-- Deliberately a standalone table rather than columns on Post: the stream key is
-- a credential, and Post is read by ~22 call sites, several of which return whole
-- rows. A column there would be one careless findMany away from leaking.
CREATE TABLE "public"."ivs_broadcasts" (
  "id"              TEXT NOT NULL,
  "post_id"         TEXT NOT NULL,
  "creator_email"   TEXT NOT NULL,
  "stream_key"      TEXT NOT NULL,
  "ingest_endpoint" TEXT NOT NULL,
  "channel_arn"     TEXT NOT NULL,
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ivs_broadcasts_pkey" PRIMARY KEY ("id")
);

-- One credential row per LIVE post; the route looks up by post_id.
CREATE UNIQUE INDEX "ivs_broadcasts_post_id_key"
  ON "public"."ivs_broadcasts" ("post_id");

CREATE INDEX "ivs_broadcasts_creator_email_idx"
  ON "public"."ivs_broadcasts" ("creator_email");

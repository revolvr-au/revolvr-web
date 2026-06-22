-- Age Gate Phase 1: additive age-state columns on public.profiles.
--
-- profiles is keyed by "email" (PK), RLS is currently DISABLED on it (no policies),
-- so these are plain additive columns: no policy to add/revoke, no backfill risk.
--
-- PRIVACY (locked): raw date of birth is NEVER stored. DOB enters the request,
-- is converted to flags + the two derived crossover dates below, then discarded.
-- (OAIC data-minimisation posture.)
--
-- isMinor already exists (added in 20260530000000_add_dm) and is intentionally NOT
-- re-added here. It remains the source of truth for the DM minor block.

ALTER TABLE "public"."profiles"
  ADD COLUMN "age_status"       TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | CLEARED | EXCLUDED
  ADD COLUMN "age_method"       TEXT,            -- provenance, e.g. "self_attest_v1"
  ADD COLUMN "age_jurisdiction" TEXT,            -- country code used for THIS decision, e.g. "AU"
  ADD COLUMN "age_verified_at"  TIMESTAMPTZ(6),
  ADD COLUMN "adult_at"         TIMESTAMPTZ(6),  -- derived: when user crosses minorThreshold (18)
  ADD COLUMN "eligible_at"      TIMESTAMPTZ(6);  -- derived: when user crosses accountMinAge; NULL if already eligible

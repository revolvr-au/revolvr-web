-- Age Gate Phase 1 (follow-up): store the affirmative self-attestation as its OWN
-- column instead of overloading age_method. Keeps the child-safety evidence trail
-- clean and answerable on its own terms:
--   age_method          = HOW the decision was made (e.g. "self_attest_v1")
--   age_attested_over16 = the user's explicit "I am 16+" affirmation
--
-- Additive, nullable, NO default and NO backfill on purpose — three honest states:
--   NULL  = no attestation on record (rows written before this column / no box sent)
--   false = box explicitly not ticked
--   true  = affirmed
-- A default of false would conflate "no record" with "declined", which is exactly
-- the muddiness a dedicated column exists to avoid.
--
-- PRIVACY (locked): still no raw DOB stored — this is a boolean affirmation only.

ALTER TABLE "public"."profiles"
  ADD COLUMN "age_attested_over16" BOOLEAN;

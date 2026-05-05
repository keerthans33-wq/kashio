-- Safe: adds workPercent only if not present; no data loss, no backfill needed.
-- null = full amount (100%); explicit 0-100 = work-use split percentage.
ALTER TABLE "DeductionCandidate" ADD COLUMN IF NOT EXISTS "workPercent" INTEGER;

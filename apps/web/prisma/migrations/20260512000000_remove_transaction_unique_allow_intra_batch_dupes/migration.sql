-- Drop the unique constraint that was incorrectly preventing duplicate rows
-- within the same CSV upload (e.g. two identical $9.99 charges on the same day).
-- Duplicate detection is now handled in application code (importPipeline.ts)
-- and only compares against transactions from PREVIOUS upload batches.
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_userId_date_description_amount_key";

-- Replace with a non-unique index to keep cross-batch lookup fast.
CREATE INDEX IF NOT EXISTS "Transaction_userId_date_description_amount_idx"
  ON "Transaction" ("userId", "date", "description", "amount");

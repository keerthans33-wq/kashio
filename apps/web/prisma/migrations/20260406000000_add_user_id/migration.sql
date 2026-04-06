-- AddColumn userId to BasiqConnection, ImportBatch, Transaction, DeductionCandidate
-- and update the Transaction unique constraint to include userId.
--
-- Existing rows (if any) will get an empty string as a temporary userId.
-- After applying this migration, any existing data will need to be re-imported
-- by authenticated users.

-- BasiqConnection
ALTER TABLE "BasiqConnection" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BasiqConnection" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "BasiqConnection" ADD CONSTRAINT "BasiqConnection_userId_key" UNIQUE ("userId");

-- ImportBatch
ALTER TABLE "ImportBatch" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ImportBatch" ALTER COLUMN "userId" DROP DEFAULT;

-- Transaction: add column, swap unique constraint
ALTER TABLE "Transaction" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Transaction" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_date_description_amount_key";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_date_description_amount_key" UNIQUE ("userId", "date", "description", "amount");

-- DeductionCandidate
ALTER TABLE "DeductionCandidate" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "DeductionCandidate" ALTER COLUMN "userId" DROP DEFAULT;

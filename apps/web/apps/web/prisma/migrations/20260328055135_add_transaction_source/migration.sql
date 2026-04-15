-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('CSV', 'DEMO_BANK', 'BASIQ');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "source" "TransactionSource" NOT NULL DEFAULT 'CSV';

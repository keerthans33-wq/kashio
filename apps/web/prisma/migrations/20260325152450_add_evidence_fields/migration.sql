-- AlterTable
ALTER TABLE "DeductionCandidate" ADD COLUMN     "evidenceNote" TEXT,
ADD COLUMN     "hasEvidence" BOOLEAN NOT NULL DEFAULT false;

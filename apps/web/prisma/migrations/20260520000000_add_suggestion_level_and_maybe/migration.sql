-- Add MAYBE to DeductionStatus enum
ALTER TYPE "DeductionStatus" ADD VALUE 'MAYBE';

-- Create SuggestionLevel enum
CREATE TYPE "SuggestionLevel" AS ENUM ('LIKELY_WORK_RELATED', 'POSSIBLE_WORK_RELATED', 'PROBABLY_PERSONAL');

-- Add suggestionLevel to DeductionCandidate
ALTER TABLE "DeductionCandidate" ADD COLUMN "suggestionLevel" "SuggestionLevel" NOT NULL DEFAULT 'PROBABLY_PERSONAL';

-- Backfill suggestionLevel from existing confidence values
UPDATE "DeductionCandidate"
SET "suggestionLevel" = CASE
  WHEN confidence = 'HIGH'   THEN 'LIKELY_WORK_RELATED'::"SuggestionLevel"
  WHEN confidence = 'MEDIUM' THEN 'POSSIBLE_WORK_RELATED'::"SuggestionLevel"
  ELSE 'PROBABLY_PERSONAL'::"SuggestionLevel"
END;

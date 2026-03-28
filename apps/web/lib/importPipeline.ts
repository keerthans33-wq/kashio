// Shared import pipeline used by both the CSV route and the Basiq route.
//
// Accepts rows that have already been validated and normalised by the caller,
// then handles everything from batch creation to deduction detection.

import { db } from "./db";
import { detectDeduction } from "./rules";

export type PipelineRow = {
  date: string;               // YYYY-MM-DD
  description: string;
  normalizedMerchant: string;
  amount: number;             // negative = debit, positive = credit
};

export type PipelineResult = {
  batchId: string;
  inserted: number;
  duplicates: number;
  flagged: number;
};

export async function runImportPipeline(
  rows: PipelineRow[],
  fileName: string,
): Promise<PipelineResult> {
  // Create the batch record first so every transaction carries its batch ID.
  const batch = await db.importBatch.create({
    data: { fileName, insertedCount: 0 },
  });

  const result = await db.transaction.createMany({
    data: rows.map((r) => ({ ...r, importBatchId: batch.id })),
    skipDuplicates: true,
  });
  const inserted = result.count;

  // Update the batch with the real inserted count (skipDuplicates means it may be less than rows.length).
  await db.importBatch.update({
    where: { id: batch.id },
    data: { insertedCount: inserted },
  });

  // Re-fetch saved rows to get their DB-assigned IDs for candidate creation.
  const savedTransactions = await db.transaction.findMany({
    where: {
      OR: rows.map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
      })),
    },
  });

  // Run each transaction through the deduction rules engine.
  const candidates = savedTransactions
    .map((t) => {
      const match = detectDeduction({
        description: t.description,
        normalizedMerchant: t.normalizedMerchant,
        amount: t.amount,
      });
      if (!match) return null;
      return {
        transactionId: t.id,
        category: match.category,
        confidence: match.confidence,
        reason: match.reason,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (candidates.length > 0) {
    await db.deductionCandidate.createMany({ data: candidates, skipDuplicates: true });
  }

  return {
    batchId: batch.id,
    inserted,
    duplicates: rows.length - inserted,
    flagged: candidates.length,
  };
}

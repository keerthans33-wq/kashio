// Shared import pipeline used by both the CSV route and the Basiq route.
//
// Accepts rows that have already been validated and normalised by the caller,
// then handles everything from batch creation to deduction detection.
//
// Deduplication key: Transaction.@@unique([date, description, amount])
// Both the CSV mapper and the Basiq mapper normalise to the same formats
// (parseDate → YYYY-MM-DD, parseAmount → float, description.trim()), so the
// same real-world transaction will always produce the same key regardless of
// which import path was used.

import { db } from "./db";
import { detectDeduction } from "./rules";
import type { IngestionRow } from "./ingestion/types";

export type TransactionSource = "CSV" | "DEMO_BANK" | "BASIQ";

// PipelineRow is the same shape as IngestionRow — aliased here for backwards compatibility.
export type PipelineRow = IngestionRow;

export type PipelineResult = {
  batchId: string | null;     // null when nothing was inserted (all duplicates)
  inserted: number;
  duplicates: number;
  flagged: number;
};

export async function runImportPipeline(
  rows: PipelineRow[],
  fileName: string,
  source: TransactionSource = "CSV",
): Promise<PipelineResult> {
  // Create the batch record first so every transaction carries its batch ID.
  const batch = await db.importBatch.create({
    data: { fileName, insertedCount: 0 },
  });

  const result = await db.transaction.createMany({
    data: rows.map((r) => ({ ...r, source, importBatchId: batch.id })),
    skipDuplicates: true,  // relies on @@unique([date, description, amount])
  });
  const inserted = result.count;

  if (inserted === 0) {
    // Every row was a duplicate — delete the empty batch so it doesn't appear
    // in "Previously imported" with a zero count.
    await db.importBatch.delete({ where: { id: batch.id } });
    return { batchId: null, inserted: 0, duplicates: rows.length, flagged: 0 };
  }

  // Update the batch with the real inserted count.
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
    // skipDuplicates ensures existing candidates are not overwritten if the
    // same transaction was already flagged in a previous import.
    await db.deductionCandidate.createMany({ data: candidates, skipDuplicates: true });
  }

  return {
    batchId: batch.id,
    inserted,
    duplicates: rows.length - inserted,
    flagged: candidates.length,
  };
}

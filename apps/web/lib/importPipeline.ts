import { db } from "./db";
import { detectDeduction } from "./rules";
import { refineTransaction } from "./gemini/refineTransaction";
import { classifyTransaction } from "./gemini/classifyTransaction";
import type { IngestionRow } from "./ingestion/types";

export type TransactionSource = "CSV" | "DEMO_BANK" | "BASIQ";
export type PipelineRow = IngestionRow;

export type PipelineResult = {
  batchId: string | null;
  inserted: number;
  duplicates: number;
  flagged: number;
  totalValue: number;
};

export async function runImportPipeline(
  rows: PipelineRow[],
  fileName: string,
  source: TransactionSource = "CSV",
  userId: string,
  userType?: string | null,
): Promise<PipelineResult> {
  // Check for duplicates against transactions from PREVIOUS uploads only.
  // Rows within the same CSV are never deduplicated against each other —
  // two identical charges on the same day in one file are real distinct transactions.
  const existing = await db.transaction.findMany({
    where: { userId },
    select: { date: true, description: true, amount: true },
  });

  const existingKeys = new Set(
    existing.map((t) => `${t.date}|${t.description}|${t.amount}`)
  );

  const newRows = rows.filter(
    (r) => !existingKeys.has(`${r.date}|${r.description}|${r.amount}`)
  );

  // duplicates = rows skipped because they already exist from a previous upload
  const duplicates = rows.length - newRows.length;

  if (newRows.length === 0) {
    return { batchId: null, inserted: 0, duplicates, flagged: 0, totalValue: 0 };
  }

  const batch = await db.importBatch.create({
    data: { fileName, insertedCount: 0, source, userId },
  });

  await db.transaction.createMany({
    data: newRows.map((r) => ({ ...r, source, importBatchId: batch.id, userId })),
  });

  await db.importBatch.update({
    where: { id: batch.id },
    data: { insertedCount: newRows.length },
  });

  const savedTransactions = await db.transaction.findMany({
    where: { importBatchId: batch.id },
  });

  const candidates = (
    await Promise.all(
      savedTransactions.map(async (t) => {
        const tx = {
          description:        t.description,
          normalizedMerchant: t.normalizedMerchant,
          amount:             t.amount,
        };

        const rawMatch = detectDeduction(tx, userType);

        // Rules engine matched — Gemini refines wording and may upgrade LOW→MEDIUM.
        // Rules engine missed — Gemini classifies from scratch as a LOW-confidence fallback
        // so transactions without explicit rule coverage are still surfaced for review.
        const match = rawMatch
          ? await refineTransaction(rawMatch, tx, userType)
          : await classifyTransaction(tx, userType);

        if (!match) return null;

        return {
          transactionId:    t.id,
          category:         match.category,
          confidence:       match.confidence,
          reason:           match.reason,
          confidenceReason: match.confidenceReason,
          mixedUse:         match.mixedUse ?? false,
        };
      }),
    )
  ).filter((c): c is NonNullable<typeof c> => c !== null);

  // Check which transactions already have a candidate to avoid duplicates
  const existingCandidateTxIds = new Set(
    (await db.deductionCandidate.findMany({
      where: { userId },
      select: { transactionId: true },
    })).map((c) => c.transactionId)
  );

  const newCandidates = candidates.filter(
    (c) => !existingCandidateTxIds.has(c.transactionId)
  );

  if (newCandidates.length > 0) {
    await db.deductionCandidate.createMany({
      data: newCandidates.map((c) => ({ ...c, userId })),
    });
  }

  const txById = new Map(savedTransactions.map((t) => [t.id, t]));
  const totalValue = candidates.reduce(
    (sum, c) => sum + Math.abs(txById.get(c.transactionId)?.amount ?? 0),
    0,
  );

  return {
    batchId: batch.id,
    inserted: newRows.length,
    duplicates,
    flagged: candidates.length,
    totalValue,
  };
}

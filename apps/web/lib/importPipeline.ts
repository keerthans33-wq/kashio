import { db } from "./db";
import { detectDeduction } from "./rules";
import { refineTransaction } from "./ollama/refineTransaction";
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
  // Manually filter duplicates instead of relying on skipDuplicates: true,
  // which has known issues with Prisma's driverAdapters preview feature.
  const existing = await db.transaction.findMany({
    where: { userId },
    select: { date: true, description: true, amount: true },
  });

  const existingKeys = new Set(
    existing.map((t) => `${t.date}|${t.description}|${t.amount}`)
  );

  const unseenRows = rows.filter(
    (r) => !existingKeys.has(`${r.date}|${r.description}|${r.amount}`)
  );

  // Also deduplicate within the new batch itself (same day + same description + same amount).
  // Without this, createMany throws a unique constraint violation when the file has
  // identical-looking transactions (e.g. two $9.99 coffee purchases on the same day).
  const seenInBatch = new Set<string>();
  const newRows = unseenRows.filter((r) => {
    const key = `${r.date}|${r.description}|${r.amount}`;
    if (seenInBatch.has(key)) return false;
    seenInBatch.add(key);
    return true;
  });

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
        if (!rawMatch) return null;

        // Optional Ollama refinement — only fires for LOW-confidence matches
        // when OLLAMA_ENABLED=true. Falls back to the original match silently.
        const match = await refineTransaction(rawMatch, tx, userType);

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

import { db } from "./db";
import { detectDeduction } from "./rules";
import { isExcluded } from "./rules/shared";
import { isBlacklisted } from "./rules/blacklist";
import { refineTransaction } from "./gemini/refineTransaction";
import { classifyTransaction } from "./gemini/classifyTransaction";
import { logClassificationSummary } from "./classificationAudit";
import { CATEGORIES } from "./rules/categories";
import type { ClassificationAuditEntry } from "./classificationAudit";
import type { DeductionMatch } from "./rules/types";
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

// Returned when both the rules engine and Gemini produce no match for an
// expense that is not blacklisted and not excluded. Surfaced for user review
// rather than silently dropped — the user can confirm or reject.
function safeFallbackMatch(amount: number): DeductionMatch {
  return {
    category:         CATEGORIES.UNCATEGORISED,
    confidence:       "LOW",
    reason:           "This expense wasn't matched by any deduction rule. Review to check if it has a work-related purpose.",
    confidenceReason: "No rule or AI match found. Confirm manually whether this is a deductible expense.",
    mixedUse:         true,
    needsReceipt:     Math.abs(amount) > 82.50,
    canUpgrade:       false,
    signals:          { safeFallback: true },
  };
}

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

  const auditEntries: ClassificationAuditEntry[] = [];

  const candidates = (
    await Promise.all(
      savedTransactions.map(async (t) => {
        const tx = {
          description:        t.description,
          normalizedMerchant: t.normalizedMerchant,
          amount:             t.amount,
        };

        const baseAudit: ClassificationAuditEntry = {
          id:                    t.id,
          rawDescription:        t.description,
          normalizedDescription: t.normalizedMerchant,
          amount:                t.amount,
          isExpense:             t.amount < 0,
          decision:              "hidden",
        };

        // Credits and zero-amount entries are not expenses.
        if (t.amount >= 0) {
          auditEntries.push({ ...baseAudit, hiddenReason: "credit_or_zero" });
          return null;
        }

        // Refunds, reversals, reimbursements, cashback.
        if (isExcluded(tx)) {
          auditEntries.push({ ...baseAudit, hiddenReason: "excluded" });
          return null;
        }

        // Explicit personal-expense blacklist.
        if (isBlacklisted(tx, userType)) {
          auditEntries.push({ ...baseAudit, hiddenReason: "blacklisted" });
          return null;
        }

        // Rules engine — if it matches, Gemini optionally refines wording/confidence.
        // If it misses, Gemini classifies from scratch as a LOW-confidence fallback.
        // If both miss, the safety fallback surfaces the expense for manual review
        // rather than silently hiding it.
        const rawMatch = detectDeduction(tx, userType);
        let match: DeductionMatch;
        let matchSource: ClassificationAuditEntry["source"];

        if (rawMatch) {
          matchSource = "engine";
          match = await refineTransaction(rawMatch, tx, userType);
        } else {
          const classified = await classifyTransaction(tx, userType);
          if (classified !== null) {
            matchSource = "gemini";
            match = classified;
          } else {
            // Safety fallback: this expense has no explicit reason to be hidden.
            // Surface it for review rather than silently dropping it.
            matchSource = "safe_fallback";
            match = safeFallbackMatch(t.amount);
          }
        }

        auditEntries.push({
          ...baseAudit,
          decision:     "included",
          category:     match.category,
          confidence:   match.confidence,
          source:       matchSource,
          matchedAlias: match.signals.aliasMatch as string | undefined,
          reason:       match.reason,
        });

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

  console.log("[Import] classified candidates", candidates.length);
  console.log("[Import] candidates before save", candidates.map((c) => {
    const tx = savedTransactions.find((t) => t.id === c.transactionId);
    return {
      merchant:   tx?.normalizedMerchant ?? tx?.description ?? c.transactionId,
      category:   c.category,
      confidence: c.confidence,
    };
  }));

  if (newCandidates.length > 0) {
    await db.deductionCandidate.createMany({
      data: newCandidates.map((c) => ({ ...c, userId })),
    });
  }

  console.log("[Import] saved candidates count", newCandidates.length);

  const skipped = candidates.length - newCandidates.length;
  if (skipped > 0) {
    console.log(`[Import] ${skipped} candidates skipped (already in DB from a previous import)`);
  }

  logClassificationSummary(auditEntries);

  const txById = new Map(savedTransactions.map((t) => [t.id, t]));
  const totalValue = newCandidates.reduce(
    (sum, c) => sum + Math.abs(txById.get(c.transactionId)?.amount ?? 0),
    0,
  );

  return {
    batchId:    batch.id,
    inserted:   newRows.length,
    duplicates,
    flagged:    newCandidates.length,
    totalValue,
  };
}

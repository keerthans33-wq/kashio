import { db } from "./db";
import { detectDeduction } from "./rules";
import { isExcluded } from "./rules/shared";
import { getPersonalExpenseBlockReason } from "./rules/blacklist";
import { refineTransaction } from "./gemini/refineTransaction";
import { classifyTransaction } from "./gemini/classifyTransaction";
import { logClassificationSummary } from "./classificationAudit";
import { CATEGORIES } from "./rules/categories";
import { computeScore } from "./rules/scoring";
import type { ClassificationAuditEntry } from "./classificationAudit";
import type { DeductionMatch } from "./rules/types";
import type { ScoringSource } from "./rules/scoring";
import type { IngestionRow } from "./ingestion/types";
import type { MappedTransaction } from "./basiq/mapTransaction";
import type { Prisma } from "@prisma/client";

export type TransactionSource = "CSV" | "DEMO_BANK" | "BASIQ";
export type PipelineRow = IngestionRow;

export type PipelineResult = {
  batchId:    string | null;
  inserted:   number;
  duplicates: number;
  flagged:    number;
  totalValue: number;
};

export type BasiqPipelineResult = PipelineResult & { updated: number };

type SuggestionLevel = "LIKELY_WORK_RELATED" | "POSSIBLE_WORK_RELATED" | "PROBABLY_PERSONAL";

function confidenceToSuggestionLevel(confidence: "LOW" | "MEDIUM" | "HIGH"): SuggestionLevel {
  if (confidence === "HIGH")   return "LIKELY_WORK_RELATED";
  if (confidence === "MEDIUM") return "POSSIBLE_WORK_RELATED";
  return "PROBABLY_PERSONAL";
}

const BLOCK_REASON_LABELS: Record<string, string> = {
  gambling:               "Likely personal expense — gambling",
  atm_cash:               "ATM or cash withdrawal — not a deductible expense",
  generic_interest:       "Bank interest or fee — not a deductible expense",
  streaming:              "Likely personal streaming or entertainment subscription",
  alcohol:                "Likely personal alcohol purchase",
  fitness:                "Likely personal gym or fitness expense",
  entertainment:          "Likely personal entertainment venue",
  restaurant_food:        "Likely personal meal or food delivery",
  personal_medical:       "Likely personal medical or pharmacy expense",
  personal_travel_tourism:"Likely personal travel or tourism expense",
  personal_transfer:      "Personal bank transfer — not a deductible expense",
  rent:                   "Likely personal rent payment",
  personal:               "Likely personal expense",
};

function personalBlockMatch(amount: number, reason: string): DeductionMatch {
  const label = BLOCK_REASON_LABELS[reason] ?? "Likely personal expense";
  return {
    category:         CATEGORIES.UNCATEGORISED,
    confidence:       "LOW",
    reason:           label,
    confidenceReason: "Classified as probably personal based on merchant or description.",
    mixedUse:         false,
    needsReceipt:     false,
    canUpgrade:       false,
    signals:          { personalBlock: reason },
  };
}

function creditOrRefundMatch(isCredit: boolean): DeductionMatch {
  return {
    category:         CATEGORIES.UNCATEGORISED,
    confidence:       "LOW",
    reason:           isCredit
      ? "Credit or income — not a deductible expense"
      : "Refund or reversal — not a deductible expense",
    confidenceReason: "Credits, refunds, and reversals are not deductible.",
    mixedUse:         false,
    needsReceipt:     false,
    canUpgrade:       false,
    signals:          { creditOrRefund: true },
  };
}

function noContextMatch(): DeductionMatch {
  return {
    category:         CATEGORIES.UNCATEGORISED,
    confidence:       "LOW",
    reason:           "No work-related pattern detected — review if this was a business expense",
    confidenceReason: "No rule or business-context match found. Confirm manually if deductible.",
    mixedUse:         false,
    needsReceipt:     false,
    canUpgrade:       false,
    signals:          { noContext: true },
  };
}

function bizFallbackMatch(amount: number): DeductionMatch {
  return {
    category:         CATEGORIES.UNCATEGORISED,
    confidence:       "LOW",
    reason:           "Possible business expense — no specific rule matched, but description contains business-like terms. Review before claiming.",
    confidenceReason: "Business-context token detected but no specific category rule matched.",
    mixedUse:         true,
    needsReceipt:     Math.abs(amount) > 82.50,
    canUpgrade:       false,
    signals:          { bizFallback: true },
  };
}

const BIZ_TOKENS = [
  "software", "subscription", "cloud", "hosting", "domain",
  "advertising", "marketing", "crm", "accounting",
  "invoice", "fee", "merchant", "processing",
  "office", "supplies", "tools", "equipment", "workwear",
  "ppe", "training", "course", "membership", "professional",
  "asic", "abn", "saas", "license", "licence", "renewal",
];

function hasBizToken(tx: { normalizedMerchant: string; description: string }): boolean {
  const combined = `${tx.normalizedMerchant} ${tx.description}`.toLowerCase();
  if (BIZ_TOKENS.some((t) => combined.includes(t))) return true;
  if (/\bads\b/.test(combined))    return true;
  if (/\btax\b/.test(combined))    return true;
  if (/\bsafety\b/.test(combined)) return true;
  return false;
}

// ── Classification helper ─────────────────────────────────────────────────────

type ClassifiableRow = {
  id: string;
  description: string;
  normalizedMerchant: string;
  amount: number;
};

// classifySavedTransactions classifies a list of already-inserted DB rows and
// writes DeductionCandidate records. Skips transactions that already have a
// candidate (idempotent — safe to call on resync without overwriting user decisions).
// Returns flagged count and total potential deduction value.
async function classifySavedTransactions(
  transactions: ClassifiableRow[],
  userId: string,
  userType?: string | null,
): Promise<{ flagged: number; totalValue: number }> {
  if (transactions.length === 0) return { flagged: 0, totalValue: 0 };

  const auditEntries: ClassificationAuditEntry[] = [];

  const candidates = (
    await Promise.all(
      transactions.map(async (t) => {
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

        let match: DeductionMatch;
        let suggestionLevel: SuggestionLevel;
        let matchSource: ClassificationAuditEntry["source"] = "engine";

        if (t.amount >= 0) {
          match          = creditOrRefundMatch(true);
          suggestionLevel = "PROBABLY_PERSONAL";
          auditEntries.push({ ...baseAudit, decision: "included", category: match.category, confidence: match.confidence, source: "engine", reason: match.reason });
        } else if (isExcluded(tx)) {
          match          = creditOrRefundMatch(false);
          suggestionLevel = "PROBABLY_PERSONAL";
          auditEntries.push({ ...baseAudit, decision: "included", category: match.category, confidence: match.confidence, source: "engine", reason: match.reason });
        } else {
          const blockReason = getPersonalExpenseBlockReason(tx, userType);

          if (blockReason !== null) {
            match          = personalBlockMatch(t.amount, blockReason);
            suggestionLevel = "PROBABLY_PERSONAL";
            auditEntries.push({ ...baseAudit, decision: "included", category: match.category, confidence: match.confidence, source: "engine", reason: match.reason });
          } else {
            const rawMatch = detectDeduction(tx, userType);

            if (rawMatch) {
              matchSource     = "engine";
              match           = await refineTransaction(rawMatch, tx, userType);
              suggestionLevel = confidenceToSuggestionLevel(match.confidence);
            } else {
              const classified = await classifyTransaction(tx, userType);
              if (classified !== null) {
                matchSource     = "gemini";
                match           = classified;
                suggestionLevel = confidenceToSuggestionLevel(match.confidence);
              } else if (hasBizToken(tx)) {
                matchSource     = "safe_fallback";
                match           = bizFallbackMatch(t.amount);
                suggestionLevel = "POSSIBLE_WORK_RELATED";
              } else {
                matchSource     = "engine";
                match           = noContextMatch();
                suggestionLevel = "PROBABLY_PERSONAL";
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
          }
        }

        const score = computeScore({
          confidence:   match.confidence,
          signals:      match.signals,
          mixedUse:     match.mixedUse ?? false,
          needsReceipt: match.needsReceipt,
          source:       matchSource as ScoringSource,
        });

        return {
          transactionId:    t.id,
          category:         match.category,
          confidence:       match.confidence as "LOW" | "MEDIUM" | "HIGH",
          reason:           match.reason,
          confidenceReason: match.confidenceReason ?? null,
          mixedUse:         match.mixedUse ?? false,
          suggestionLevel,
          score,
        };
      }),
    )
  ).filter((c): c is NonNullable<typeof c> => c !== null);

  // Skip candidates that already exist — never overwrite user-reviewed statuses.
  const existingCandidateTxIds = new Set(
    (await db.deductionCandidate.findMany({
      where:  { userId },
      select: { transactionId: true },
    })).map((c) => c.transactionId)
  );

  const newCandidates = candidates.filter(
    (c) => !existingCandidateTxIds.has(c.transactionId)
  );

  console.log("[Import] classified candidates", candidates.length);

  if (newCandidates.length > 0) {
    await db.deductionCandidate.createMany({
      data: newCandidates.map((c) => ({ ...c, userId })),
    });
  }

  console.log("[Import] saved candidates count", newCandidates.length);

  logClassificationSummary(auditEntries);

  const txById      = new Map(transactions.map((t) => [t.id, t]));
  const workRelated = newCandidates.filter(
    (c) => c.suggestionLevel === "LIKELY_WORK_RELATED" || c.suggestionLevel === "POSSIBLE_WORK_RELATED"
  );
  const totalValue  = workRelated.reduce(
    (sum, c) => sum + Math.abs(txById.get(c.transactionId)?.amount ?? 0),
    0,
  );

  return { flagged: workRelated.length, totalValue };
}

// ── CSV / demo import pipeline ────────────────────────────────────────────────

export async function runImportPipeline(
  rows: PipelineRow[],
  fileName: string,
  source: TransactionSource = "CSV",
  userId: string,
  userType?: string | null,
): Promise<PipelineResult> {
  // Deduplicate against previous uploads (within-batch duplicates are kept intentionally).
  const existing = await db.transaction.findMany({
    where:  { userId },
    select: { date: true, description: true, amount: true },
  });

  const existingKeys = new Set(
    existing.map((t) => `${t.date}|${t.description}|${t.amount}`)
  );

  const newRows = rows.filter(
    (r) => !existingKeys.has(`${r.date}|${r.description}|${r.amount}`)
  );

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
    data:  { insertedCount: newRows.length },
  });

  const savedTransactions = await db.transaction.findMany({
    where:  { importBatchId: batch.id },
    select: { id: true, description: true, normalizedMerchant: true, amount: true },
  });

  const { flagged, totalValue } = await classifySavedTransactions(savedTransactions, userId, userType);

  return {
    batchId:    batch.id,
    inserted:   newRows.length,
    duplicates,
    flagged,
    totalValue,
  };
}

// ── Basiq bank sync pipeline ──────────────────────────────────────────────────
//
// Three-stage dedup (ordered by precision):
//   1. providerTransactionId  — exact Basiq transaction ID match
//   2. transactionHash        — content hash match (catches re-imported Basiq rows)
//   3. date|description|amount — composite match against all user rows (catches
//                                CSV rows that overlap with the bank date range)
//
// Existing rows that match stages 1 or 2 get their rawProviderData refreshed.
// Rows that match only stage 3 (CSV dups) are silently skipped — we don't
// update CSV rows with bank data.
// Newly inserted rows go through the full deduction classification pipeline.
// DeductionCandidate records are never overwritten, preserving user-reviewed statuses.

export async function runBasiqImportPipeline(
  rows: MappedTransaction[],
  batchLabel: string,
  connectionId: string,
  userId: string,
  userType?: string | null,
): Promise<BasiqPipelineResult> {
  if (rows.length === 0) {
    // Still update lastSyncAt and log the attempt.
    await db.bankConnection.update({
      where: { id: connectionId },
      data:  { lastSyncAt: new Date() },
    });
    await db.bankSyncLog.create({
      data: {
        userId,
        connectionId,
        status:               "success",
        message:              "No transactions in the selected date range",
        transactionsImported: 0,
        completedAt:          new Date(),
      },
    });
    return { batchId: null, inserted: 0, updated: 0, duplicates: 0, flagged: 0, totalValue: 0 };
  }

  const providerIds = rows.map((r) => r.providerTransactionId);
  const hashes      = rows.map((r) => r.transactionHash);

  // ── Stage 1 & 2: look up existing by providerTransactionId and transactionHash ──
  const [existingByProvId, existingByHash] = await Promise.all([
    db.transaction.findMany({
      where:  { userId, providerTransactionId: { in: providerIds } },
      select: { id: true, providerTransactionId: true },
    }),
    db.transaction.findMany({
      where:  { userId, transactionHash: { in: hashes }, providerTransactionId: null },
      select: { id: true, transactionHash: true },
    }),
  ]);

  const provIdToDbId = new Map(existingByProvId.map((t) => [t.providerTransactionId!, t.id]));
  const hashToDbId   = new Map(existingByHash.map((t) => [t.transactionHash!, t.id]));

  // Partition: "update rawProviderData" vs "needs further dedup check"
  const toUpdate:     Array<{ row: MappedTransaction; dbId: string }> = [];
  const toCheckCsvDup: MappedTransaction[] = [];

  for (const row of rows) {
    const byProvId = provIdToDbId.get(row.providerTransactionId);
    if (byProvId) { toUpdate.push({ row, dbId: byProvId }); continue; }
    const byHash = hashToDbId.get(row.transactionHash);
    if (byHash) { toUpdate.push({ row, dbId: byHash }); continue; }
    toCheckCsvDup.push(row);
  }

  // ── Stage 3: check remaining against existing date|description|amount ──────
  let toInsert = toCheckCsvDup;
  if (toCheckCsvDup.length > 0) {
    const dates   = toCheckCsvDup.map((r) => r.date);
    const minDate = dates.reduce((m, d) => (d < m ? d : m));
    const maxDate = dates.reduce((m, d) => (d > m ? d : m));

    const existingInRange = await db.transaction.findMany({
      where:  { userId, date: { gte: minDate, lte: maxDate } },
      select: { date: true, description: true, amount: true },
    });
    const existingKeys = new Set(
      existingInRange.map((t) => `${t.date}|${t.description}|${t.amount}`)
    );
    toInsert = toCheckCsvDup.filter(
      (r) => !existingKeys.has(`${r.date}|${r.description}|${r.amount}`)
    );
  }

  const duplicates = rows.length - toInsert.length;

  // ── Refresh rawProviderData on existing Basiq rows ────────────────────────
  // Safe: only touches rawProviderData — never date, amount, description,
  // or anything the DeductionCandidate references.
  if (toUpdate.length > 0) {
    await Promise.all(
      toUpdate.map(({ row, dbId }) =>
        db.transaction.update({
          where: { id: dbId },
          data:  { rawProviderData: row.rawProviderData as Prisma.InputJsonValue },
        })
      )
    );
  }

  // ── Insert new transactions ────────────────────────────────────────────────
  let batchId:    string | null = null;
  let inserted    = 0;
  let flagged     = 0;
  let totalValue  = 0;

  if (toInsert.length > 0) {
    const batch = await db.importBatch.create({
      data: { fileName: batchLabel, insertedCount: 0, source: "BASIQ", userId },
    });
    batchId = batch.id;

    await db.transaction.createMany({
      data: toInsert.map((r) => ({
        userId,
        date:                  r.date,
        description:           r.description,
        normalizedMerchant:    r.normalizedMerchant,
        amount:                r.amount,
        source:                "BASIQ" as TransactionSource,
        importBatchId:         batch.id,
        providerTransactionId: r.providerTransactionId,
        rawProviderData:       r.rawProviderData as Prisma.InputJsonValue,
        accountId:             r.accountId,
        isPending:             r.isPending,
        transactionHash:       r.transactionHash,
      })),
      skipDuplicates: true, // safety net for partial-unique-index races
    });

    const newTransactions = await db.transaction.findMany({
      where:  { importBatchId: batch.id },
      select: { id: true, description: true, normalizedMerchant: true, amount: true },
    });

    inserted = newTransactions.length; // actual count after skipDuplicates

    await db.importBatch.update({
      where: { id: batch.id },
      data:  { insertedCount: inserted },
    });

    ({ flagged, totalValue } = await classifySavedTransactions(newTransactions, userId, userType));
  }

  // ── Update connection metadata + write sync log ────────────────────────────
  await db.bankConnection.update({
    where: { id: connectionId },
    data:  { lastSyncAt: new Date() },
  });

  await db.bankSyncLog.create({
    data: {
      userId,
      connectionId,
      status:               "success",
      message:              `${inserted} new, ${toUpdate.length} refreshed, ${duplicates - toUpdate.length} skipped`,
      transactionsImported: inserted,
      completedAt:          new Date(),
    },
  });

  return {
    batchId,
    inserted,
    updated:    toUpdate.length,
    duplicates,
    flagged,
    totalValue,
  };
}

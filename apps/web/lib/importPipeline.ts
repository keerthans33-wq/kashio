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

// Tokens that signal a transaction might be a business expense even if the
// merchant is unknown. The safe fallback only fires when at least one matches.
const BIZ_TOKENS = [
  "software", "subscription", "cloud", "hosting", "domain",
  "advertising", "marketing", "crm", "accounting",
  "invoice", "fee", "merchant", "processing",
  "office", "supplies", "tools", "equipment", "workwear",
  "ppe", "training", "course", "membership", "professional",
  "asic", "abn", "saas", "license", "licence", "renewal",
];

function hasBizToken(tx: { normalizedMerchant: string; description: string }): string | null {
  const combined = `${tx.normalizedMerchant} ${tx.description}`.toLowerCase();
  const plain = BIZ_TOKENS.find((t) => combined.includes(t));
  if (plain) return plain;
  if (/\bads\b/.test(combined))    return "ads";
  if (/\btax\b/.test(combined))    return "tax";
  if (/\bsafety\b/.test(combined)) return "safety";
  return null;
}

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

        // Personal-expense suppression — runs before rules engine and AI.
        const blockReason = getPersonalExpenseBlockReason(tx, userType);
        if (blockReason !== null) {
          console.log("[Import:hidden]", {
            merchant:              t.normalizedMerchant,
            normalizedDescription: t.description,
            amount:                t.amount,
            hiddenReason:          blockReason,
            source:                "personal_expense_suppression",
          });
          auditEntries.push({ ...baseAudit, hiddenReason: "blacklisted" });
          return null;
        }

        // Rules engine — if it matches, Gemini optionally refines wording/confidence.
        // If it misses, Gemini classifies from scratch as a LOW-confidence fallback.
        // If both miss, the safety fallback fires ONLY when at least one business-like
        // token is present — random personal expenses are silently dropped instead.
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
            // Safe fallback only fires when there is at least one business-like token.
            // Without it, the expense has no signal that it could be deductible.
            const bizToken = hasBizToken(tx);
            if (bizToken === null) {
              auditEntries.push({ ...baseAudit, hiddenReason: "no_business_context" });
              return null;
            }
            console.log("[Import:fallback]", {
              merchant:              t.normalizedMerchant,
              normalizedDescription: t.description,
              amount:                t.amount,
              includedReason:        bizToken,
              source:                "business_token_fallback",
            });
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
          confidence:       match.confidence,
          reason:           match.reason,
          confidenceReason: match.confidenceReason,
          mixedUse:         match.mixedUse ?? false,
          score,
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

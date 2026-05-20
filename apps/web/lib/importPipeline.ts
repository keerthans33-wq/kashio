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

export type TransactionSource = "CSV" | "DEMO_BANK" | "BASIQ";
export type PipelineRow = IngestionRow;

export type PipelineResult = {
  batchId:    string | null;
  inserted:   number;
  duplicates: number;
  flagged:    number;
  totalValue: number;
};

type SuggestionLevel = "LIKELY_WORK_RELATED" | "POSSIBLE_WORK_RELATED" | "PROBABLY_PERSONAL";

function confidenceToSuggestionLevel(confidence: "LOW" | "MEDIUM" | "HIGH"): SuggestionLevel {
  if (confidence === "HIGH")   return "LIKELY_WORK_RELATED";
  if (confidence === "MEDIUM") return "POSSIBLE_WORK_RELATED";
  return "PROBABLY_PERSONAL";
}

// Personal reason → user-facing suggestion reason
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

// Tokens that signal a transaction might be a business expense.
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

        let match: DeductionMatch;
        let suggestionLevel: SuggestionLevel;
        let matchSource: ClassificationAuditEntry["source"] = "engine";

        // ── Credits (income, not expenses) ─────────────────────────────────
        if (t.amount >= 0) {
          match          = creditOrRefundMatch(true);
          suggestionLevel = "PROBABLY_PERSONAL";
          auditEntries.push({ ...baseAudit, decision: "included", category: match.category, confidence: match.confidence, source: "engine", reason: match.reason });
        }
        // ── Refunds / reversals ────────────────────────────────────────────
        else if (isExcluded(tx)) {
          match          = creditOrRefundMatch(false);
          suggestionLevel = "PROBABLY_PERSONAL";
          auditEntries.push({ ...baseAudit, decision: "included", category: match.category, confidence: match.confidence, source: "engine", reason: match.reason });
        }
        // ── Personal expense suppression → PROBABLY_PERSONAL ──────────────
        else {
          const blockReason = getPersonalExpenseBlockReason(tx, userType);

          if (blockReason !== null) {
            match          = personalBlockMatch(t.amount, blockReason);
            suggestionLevel = "PROBABLY_PERSONAL";
            auditEntries.push({ ...baseAudit, decision: "included", category: match.category, confidence: match.confidence, source: "engine", reason: match.reason });
          } else {
            // ── Rules engine ─────────────────────────────────────────────
            const rawMatch = detectDeduction(tx, userType);

            if (rawMatch) {
              matchSource     = "engine";
              match           = await refineTransaction(rawMatch, tx, userType);
              suggestionLevel = confidenceToSuggestionLevel(match.confidence);
            } else {
              // ── Gemini fallback ─────────────────────────────────────────
              const classified = await classifyTransaction(tx, userType);
              if (classified !== null) {
                matchSource     = "gemini";
                match           = classified;
                suggestionLevel = confidenceToSuggestionLevel(match.confidence);
              } else if (hasBizToken(tx)) {
                // Business-context fallback → POSSIBLE, not buried in Personal
                matchSource     = "safe_fallback";
                match           = bizFallbackMatch(t.amount);
                suggestionLevel = "POSSIBLE_WORK_RELATED";
              } else {
                // No signal at all → PROBABLY_PERSONAL
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

  // Avoid duplicating candidates that already exist from previous imports.
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

  const txById      = new Map(savedTransactions.map((t) => [t.id, t]));
  const workRelated = newCandidates.filter(
    (c) => c.suggestionLevel === "LIKELY_WORK_RELATED" || c.suggestionLevel === "POSSIBLE_WORK_RELATED"
  );
  const totalValue  = workRelated.reduce(
    (sum, c) => sum + Math.abs(txById.get(c.transactionId)?.amount ?? 0),
    0,
  );

  return {
    batchId:    batch.id,
    inserted:   newRows.length,
    duplicates,
    flagged:    workRelated.length,
    totalValue,
  };
}

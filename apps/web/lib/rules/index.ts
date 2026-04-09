import type { TransactionInput, DeductionMatch, RawMatch, Rule } from "./types";
import { isExcluded, isPersonalUse, downgradeConfidence } from "./shared";
import { detectSoftware } from "./detectSoftware";
import { detectOfficeSupplies } from "./detectOfficeSupplies";
import { detectWorkEquipment } from "./detectWorkEquipment";
import { detectWorkwear } from "./detectWorkwear";
import { detectTravel } from "./detectTravel";
import { detectTools } from "./detectTools";
import { detectPhoneInternet } from "./detectPhoneInternet";

const rules: Rule[] = [
  detectSoftware,
  detectOfficeSupplies,
  detectWorkEquipment,
  detectWorkwear,
  detectTravel,
  detectTools,
  detectPhoneInternet,
];

const CONFIDENCE_RANK: Record<RawMatch["confidence"], number> = {
  HIGH:   3,
  MEDIUM: 2,
  LOW:    1,
};

// Runs all rules against a transaction and returns the highest-confidence
// match with its explanation, or null if nothing matches.
export function detectDeduction(transaction: TransactionInput): DeductionMatch | null {
  // Only debit transactions (negative amounts) can be deductions.
  if (transaction.amount >= 0) return null;

  // Skip refunds, reversals, reimbursements, and cashback.
  if (isExcluded(transaction.description)) return null;

  // Run detection on all rules, keep the rule alongside its match.
  const candidates = rules
    .map((rule) => {
      const match = rule.detect(transaction);
      return match ? { rule, match } : null;
    })
    .filter((c): c is { rule: Rule; match: RawMatch } => c !== null);

  if (candidates.length === 0) return null;

  // Pick the best match: highest confidence first, then most signals as a tie-breaker.
  const signalCount = (m: RawMatch) =>
    Object.values(m.signals).filter((v) => v !== undefined && v !== false).length;

  let { rule, match } = candidates.reduce((best, current) => {
    const bestRank = CONFIDENCE_RANK[best.match.confidence];
    const currRank = CONFIDENCE_RANK[current.match.confidence];
    if (currRank > bestRank) return current;
    if (currRank < bestRank) return best;
    // Same confidence: prefer more signals, then higher priority rule.
    const bSig = signalCount(best.match);
    const cSig = signalCount(current.match);
    if (cSig > bSig) return current;
    if (cSig < bSig) return best;
    return current.rule.priority > best.rule.priority ? current : best;
  });

  // Personal-use keywords reduce confidence by one step.
  if (isPersonalUse(transaction.description)) {
    const degraded = downgradeConfidence(match.confidence);
    if (degraded === null) return null;
    match = { ...match, confidence: degraded };
  }

  // Generate explanation from the winning rule.
  const explanation = rule.explain(match, transaction);

  return { ...match, ...explanation };
}

export type { TransactionInput, DeductionMatch };

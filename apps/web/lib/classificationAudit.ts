// Classification audit — dev-only proof logging for the import pipeline.
//
// Each transaction processed by runImportPipeline produces one entry.
// At the end of a batch, logClassificationSummary prints a summary and a table
// of any expenses that were hidden, so silent drops are immediately visible
// during development.
//
// This module has no side effects outside of console output and is never
// imported by UI code.

export type ClassificationAuditEntry = {
  id:                    string;
  rawDescription:        string;
  normalizedDescription: string;
  amount:                number;
  isExpense:             boolean;
  decision:              "included" | "hidden";
  // Populated when decision === "included"
  category?:             string;
  confidence?:           string;
  source?:               "engine" | "gemini" | "safe_fallback";
  matchedAlias?:         string;
  reason?:               string;
  // Populated when decision === "hidden"
  hiddenReason?:         "credit_or_zero" | "excluded" | "blacklisted" | "parse_error";
};

/**
 * Prints a structured classification summary to the console.
 * No-op outside development.
 */
export function logClassificationSummary(entries: ClassificationAuditEntry[]): void {
  if (process.env.NODE_ENV !== "development") return;

  const expenses           = entries.filter(e => e.isExpense);
  const included           = entries.filter(e => e.decision === "included");
  const hidden             = entries.filter(e => e.decision === "hidden");
  const hiddenExpenses     = expenses.filter(e => e.decision === "hidden");
  const aliasMatches       = included.filter(e => e.matchedAlias != null);
  const aiMatches          = included.filter(e => e.source === "gemini");
  const fallbackCandidates = included.filter(e => e.source === "safe_fallback");
  const blacklistHidden    = hidden.filter(e => e.hiddenReason === "blacklisted");
  const parserFailures     = hidden.filter(e => e.hiddenReason === "parse_error");

  console.log("\n[Kashio Classification Summary]");
  console.log({
    "total imported":      entries.length,
    "total expenses":      expenses.length,
    "included candidates": included.length,
    "hidden transactions": hidden.length,
    "alias matches":       aliasMatches.length,
    "AI matches":          aiMatches.length,
    "fallback candidates": fallbackCandidates.length,
    "blacklist hidden":    blacklistHidden.length,
    "parser failures":     parserFailures.length,
  });

  if (hiddenExpenses.length > 0) {
    console.log("[Kashio] Hidden expenses (should each have an explicit hiddenReason):");
    console.table(
      hiddenExpenses.map(x => ({
        merchant:     x.rawDescription,
        normalized:   x.normalizedDescription,
        amount:       x.amount,
        hiddenReason: x.hiddenReason ?? "MISSING — check pipeline",
      })),
    );
  }
}

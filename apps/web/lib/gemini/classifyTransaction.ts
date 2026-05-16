import "server-only";
import { gemini, GEMINI_ENABLED, GEMINI_MODEL } from "./client";
import { CATEGORIES_BY_USER_TYPE, ACTIVE_CATEGORIES } from "../rules/categories";
import type { DeductionMatch, TransactionInput } from "../rules/types";

const TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini timed out after ${ms}ms`)), ms),
    ),
  ]);
}

const USER_TYPE_LABELS: Record<string, string> = {
  employee:    "PAYG employee",
  contractor:  "contractor/ABN",
  sole_trader: "sole trader",
};

/**
 * Gemini-only classification for transactions the rules engine did not match.
 *
 * Always returns LOW confidence — the rules engine is authoritative for
 * MEDIUM/HIGH. This pass exists to catch merchants and categories the rules
 * engine doesn't have explicit coverage for. Better to over-flag at LOW than
 * to silently miss a legitimate deduction.
 *
 * Returns null if Gemini says the transaction is not deductible, or on any
 * error (timeout, parse failure, unknown category).
 */
export async function classifyTransaction(
  tx:       TransactionInput,
  userType?: string | null,
): Promise<DeductionMatch | null> {
  if (!GEMINI_ENABLED || !gemini) return null;

  const userLabel  = (userType && USER_TYPE_LABELS[userType]) ?? "AU taxpayer";
  const categories = (userType ? CATEGORIES_BY_USER_TYPE[userType] : null) ?? ACTIVE_CATEGORIES;

  const prompt = `You are an Australian tax assistant. Determine whether this bank transaction is a potential work-related tax deduction.

Merchant: "${tx.normalizedMerchant}"
Description: "${tx.description}"
Amount: $${Math.abs(tx.amount).toFixed(2)}
User type: ${userLabel}

Available categories (use exact text): ${categories.join(", ")}

Rules:
- Flag if there is any plausible work-related reason for the purchase.
- Prefer to flag (return deductible:true) when uncertain — the user will review it.
- Personal-only expenses (e.g. groceries, alcohol, entertainment, holidays) are NOT deductible.
- Income, salary, refunds, and bank transfers are NOT deductible.
- Mixed-use items (partly personal, partly work) should have mixedUse:true.

Respond with JSON only.
If not a potential deduction: {"deductible":false}
If a potential deduction:
{"deductible":true,"category":"<exact category>","reason":"<one sentence why this may be work-related for a ${userLabel}>","mixedUse":<true|false>,"confidenceReason":"<one sentence on what to check before claiming>"}`;

  try {
    const result = await withTimeout(
      gemini.models.generateContent({
        model:    GEMINI_MODEL,
        contents: prompt,
        config:   { responseMimeType: "application/json" },
      }),
      TIMEOUT_MS,
    );

    const text = result.text?.trim();
    if (!text) return null;

    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed.deductible !== true) return null;

    const category         = typeof parsed.category         === "string"  ? parsed.category         : null;
    const reason           = typeof parsed.reason           === "string"  ? parsed.reason           : null;
    const confidenceReason = typeof parsed.confidenceReason === "string"  ? parsed.confidenceReason : undefined;
    const mixedUse         = typeof parsed.mixedUse         === "boolean" ? parsed.mixedUse         : true;

    // Reject hallucinated categories
    if (!category || !categories.includes(category)) return null;
    if (!reason) return null;

    return {
      category,
      confidence:       "LOW",
      reason,
      confidenceReason: confidenceReason ?? "Flagged by AI — no specific rule matched. Review before claiming.",
      mixedUse,
      needsReceipt:     Math.abs(tx.amount) > 82.50,
      canUpgrade:       false,
      signals:          { geminiOnly: true },
    };
  } catch (err) {
    console.error("[gemini/classify] fallback:", {
      error:    err instanceof Error ? err.message : String(err),
      merchant: tx.normalizedMerchant,
    });
    return null;
  }
}

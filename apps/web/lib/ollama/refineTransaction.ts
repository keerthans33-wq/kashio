// Ollama refinement layer — secondary pass over rule-engine matches.
//
// Only fires when the rules engine produced a LOW-confidence match, or when the
// transaction description is too messy for the rules to interpret reliably.
// All other matches are left untouched.
//
// Returns the original match unchanged if Ollama is disabled, unavailable,
// times out, or returns unparseable output.

import { ollamaGenerate, isOllamaEnabled } from "./client";
import { CATEGORIES } from "../rules/categories";
import type { DeductionMatch } from "../rules/types";

export type RefinementInput = {
  normalizedMerchant: string;
  description:        string;
  amount:             number;
  category:           string;
  confidence:         string;
  reason:             string;
  userType?:          string | null;
};

export type RefinementResult = {
  refinedExplanation?:   string;
  refinedCategory?:      string;
  mixedUseWarning?:      boolean;
  confidenceAdjustment?: "UP" | "DOWN" | null;
  llmUsed:               boolean;
};

// Categories the LLM is allowed to suggest — guards against hallucinated values.
const VALID_CATEGORIES = new Set<string>(Object.values(CATEGORIES));

// User-type framing phrases used in the prompt.
const USER_TYPE_DESC: Record<string, string> = {
  employee:    "an employee — deductions require the expense is work-related and unreimbursed",
  contractor:  "a contractor — most genuine business expenses are deductible",
  sole_trader: "a sole trader — genuine business expenses are deductible",
};

/**
 * Returns true when the match is worth sending to Ollama.
 * Keep this tight — we only want to pay the LLM cost on genuinely ambiguous cases.
 */
function shouldRefine(match: Pick<DeductionMatch, "confidence" | "reason">): boolean {
  if (!isOllamaEnabled()) return false;

  // Primary gate: only LOW-confidence matches benefit from refinement.
  if (match.confidence !== "LOW") return false;

  // Skip if the explanation is already rich (rule engine did a good job).
  // A short reason (< 80 chars) suggests the rule fell back to a generic template.
  if (match.reason.length < 80) return true;

  return true;
}

function buildPrompt(input: RefinementInput): string {
  const userTypeKey = input.userType ?? "employee";
  const userDesc    = USER_TYPE_DESC[userTypeKey] ?? USER_TYPE_DESC.employee;

  // Format amount as positive (debit shown as positive spend in AUD).
  const amountStr = Math.abs(input.amount).toFixed(2);

  const validCats = Object.values(CATEGORIES).join(", ");

  return `You are a conservative Australian tax assistant helping classify bank transactions.

Transaction details:
- Merchant: ${input.normalizedMerchant}
- Description: ${input.description}
- Amount: $${amountStr} AUD
- Detected category: ${input.category}
- Confidence: ${input.confidence}
- User type: ${userDesc}
- Current explanation: "${input.reason}"

Respond ONLY with a JSON object using exactly these fields:
{
  "refinedExplanation": "1-2 sentences max, plain language, hedged and conservative",
  "refinedCategory": "only include if the detected category is clearly wrong; must be one of the valid categories below",
  "mixedUseWarning": false,
  "confidenceAdjustment": null
}

Valid categories: ${validCats}
Valid confidenceAdjustment values: "UP", "DOWN", null

Rules:
- refinedExplanation must be under 35 words
- Only include refinedCategory if you are confident the category is wrong
- Set mixedUseWarning to true only if personal and business use are likely mixed
- confidenceAdjustment "UP" only if evidence is strong; "DOWN" if clearly personal; otherwise null
- Never overclaim deductibility
- Match the tone to the user type`;
}

/**
 * Safely parse the LLM response. Returns null if the output is not usable.
 * The LLM response may have extra wrapper keys — we extract only what we need.
 */
function parseResponse(raw: string): Omit<RefinementResult, "llmUsed"> | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const result: Omit<RefinementResult, "llmUsed"> = {};

    if (typeof parsed.refinedExplanation === "string" && parsed.refinedExplanation.trim().length > 0) {
      result.refinedExplanation = parsed.refinedExplanation.trim();
    }

    if (typeof parsed.refinedCategory === "string" && VALID_CATEGORIES.has(parsed.refinedCategory)) {
      result.refinedCategory = parsed.refinedCategory;
    }

    if (parsed.mixedUseWarning === true) {
      result.mixedUseWarning = true;
    }

    if (parsed.confidenceAdjustment === "UP" || parsed.confidenceAdjustment === "DOWN") {
      result.confidenceAdjustment = parsed.confidenceAdjustment;
    }

    return result;
  } catch {
    console.warn("[ollama] Failed to parse response JSON — using original match");
    return null;
  }
}

/**
 * Run the Ollama refinement pass on a LOW-confidence match.
 *
 * Safe: always returns a result. If anything fails, `llmUsed` is false and
 * the caller keeps the original rules-engine output unchanged.
 */
export async function refineTransaction(
  match:    DeductionMatch,
  tx:       { normalizedMerchant: string; description: string; amount: number },
  userType?: string | null,
): Promise<RefinementResult> {
  const fallback: RefinementResult = { llmUsed: false };

  if (!shouldRefine(match)) return fallback;

  const input: RefinementInput = {
    normalizedMerchant: tx.normalizedMerchant,
    description:        tx.description,
    amount:             tx.amount,
    category:           match.category,
    confidence:         match.confidence,
    reason:             match.reason,
    userType,
  };

  const prompt = buildPrompt(input);
  const raw    = await ollamaGenerate(prompt);

  if (!raw) return fallback;

  const parsed = parseResponse(raw);
  if (!parsed) return fallback;

  console.log(
    `[ollama] Refined "${tx.normalizedMerchant}" ` +
    `(${match.category} ${match.confidence}` +
    `${parsed.confidenceAdjustment ? ` → ${parsed.confidenceAdjustment}` : ""})`,
  );

  return { ...parsed, llmUsed: true };
}

/**
 * Apply a RefinementResult onto a DeductionMatch, returning the merged match.
 * Conservative rules:
 *   - confidenceAdjustment "UP"   only promotes LOW → MEDIUM (never higher)
 *   - confidenceAdjustment "DOWN" only demotes MEDIUM → LOW (never suppresses)
 *   - mixedUseWarning only sets to true, never clears an existing true
 */
export function applyRefinement(
  match:  DeductionMatch,
  result: RefinementResult,
): DeductionMatch {
  if (!result.llmUsed) return match;

  let { confidence, category, reason, mixedUse } = match;

  if (result.refinedExplanation) {
    reason = result.refinedExplanation;
  }

  if (result.refinedCategory) {
    category = result.refinedCategory;
  }

  if (result.mixedUseWarning) {
    mixedUse = true;
  }

  if (result.confidenceAdjustment === "UP" && confidence === "LOW") {
    confidence = "MEDIUM";
  }
  if (result.confidenceAdjustment === "DOWN" && confidence === "MEDIUM") {
    confidence = "LOW";
  }

  return { ...match, confidence, category, reason, mixedUse };
}

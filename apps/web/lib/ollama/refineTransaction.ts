// Ollama refinement layer — optional secondary pass over LOW-confidence rule matches.
//
// Only fires when confidence is LOW. Falls back silently if Ollama is disabled,
// unavailable, or returns unusable output — the original match is always preserved.

import { ollamaGenerate } from "./client";
import { CATEGORIES } from "../rules/categories";
import type { DeductionMatch } from "../rules/types";

const VALID_CATEGORIES = new Set<string>(Object.values(CATEGORIES));

const USER_TYPE_DESC: Record<string, string> = {
  employee:    "employee (work-related, unreimbursed expenses only)",
  contractor:  "contractor (genuine business expenses)",
  sole_trader: "sole trader (genuine business expenses)",
};

function buildPrompt(
  tx:       { normalizedMerchant: string; description: string; amount: number },
  match:    Pick<DeductionMatch, "category" | "confidence" | "reason">,
  userType: string | null | undefined,
): string {
  const userDesc  = USER_TYPE_DESC[userType ?? ""] ?? USER_TYPE_DESC.employee;
  const validCats = Object.values(CATEGORIES).join(", ");

  return `You are a conservative Australian tax assistant.

Transaction:
- Merchant: ${tx.normalizedMerchant}
- Description: ${tx.description}
- Amount: $${Math.abs(tx.amount).toFixed(2)} AUD
- Detected category: ${match.category}
- User type: ${userDesc}
- Current explanation: "${match.reason}"

Respond with JSON only:
{
  "refinedExplanation": "1-2 plain sentences, hedged and under 35 words",
  "refinedCategory": null,
  "mixedUseWarning": false,
  "confidenceAdjustment": null
}
Valid categories: ${validCats}
Set refinedCategory only if the detected category is clearly wrong.
Set confidenceAdjustment to "UP" if strongly work-related, "DOWN" if clearly personal, otherwise null.`;
}

function adjustedConfidence(
  base:       DeductionMatch["confidence"],
  adjustment: "UP" | "DOWN" | undefined,
): DeductionMatch["confidence"] {
  if (adjustment === "UP"   && base === "LOW")    return "MEDIUM";
  if (adjustment === "DOWN" && base === "MEDIUM") return "LOW";
  return base;
}

function parseResponse(raw: string): Partial<{
  refinedExplanation:   string;
  refinedCategory:      string;
  mixedUseWarning:      boolean;
  confidenceAdjustment: "UP" | "DOWN";
}> | null {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const result: ReturnType<typeof parseResponse> = {};

    if (typeof p.refinedExplanation === "string" && p.refinedExplanation.trim()) {
      result!.refinedExplanation = p.refinedExplanation.trim();
    }
    if (typeof p.refinedCategory === "string" && VALID_CATEGORIES.has(p.refinedCategory)) {
      result!.refinedCategory = p.refinedCategory;
    }
    if (p.mixedUseWarning === true) {
      result!.mixedUseWarning = true;
    }
    if (p.confidenceAdjustment === "UP" || p.confidenceAdjustment === "DOWN") {
      result!.confidenceAdjustment = p.confidenceAdjustment;
    }

    return result;
  } catch {
    console.warn("[ollama] Failed to parse JSON response — keeping original match");
    return null;
  }
}

/**
 * Run the Ollama refinement pass and return the (possibly updated) match.
 * Only fires for LOW-confidence matches. Always returns the original match on failure.
 *
 * Merge rules:
 *   - confidenceAdjustment "UP"   only promotes LOW → MEDIUM (never higher)
 *   - confidenceAdjustment "DOWN" only demotes MEDIUM → LOW (never suppresses)
 *   - mixedUseWarning can only set true, never clear an existing true
 */
export async function refineTransaction(
  match:    DeductionMatch,
  tx:       { normalizedMerchant: string; description: string; amount: number },
  userType?: string | null,
): Promise<DeductionMatch> {
  if (match.confidence !== "LOW") return match;

  const raw = await ollamaGenerate(buildPrompt(tx, match, userType));
  if (!raw) return match;

  const refined = parseResponse(raw);
  if (!refined) return match;

  console.log(
    `[ollama] Refined "${tx.normalizedMerchant}" (${match.category} ${match.confidence}` +
    `${refined.confidenceAdjustment ? ` → ${refined.confidenceAdjustment}` : ""})`,
  );

  return {
    ...match,
    reason:     refined.refinedExplanation ?? match.reason,
    category:   refined.refinedCategory    ?? match.category,
    mixedUse:   refined.mixedUseWarning    ? true : match.mixedUse,
    confidence: adjustedConfidence(match.confidence, refined.confidenceAdjustment),
  };
}

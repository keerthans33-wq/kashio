import "server-only";
import { gemini, GEMINI_ENABLED, GEMINI_MODEL } from "./client";
import type { Confidence, DeductionMatch, TransactionInput } from "@/lib/rules/types";

const TIMEOUT_MS = 8_000;

const USER_TYPE_LABELS: Record<string, string> = {
  employee:    "PAYG employee",
  contractor:  "contractor/ABN",
  sole_trader: "sole trader",
};

/** Races a promise against a hard timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Returns true for matches where Gemini can add value:
 *   LOW confidence — may improve wording and upgrade to MEDIUM
 *   mixedUse: true — may sharpen the mixed-use explanation (confidence unchanged)
 */
function shouldRefine(match: DeductionMatch): boolean {
  return match.confidence === "LOW" || match.mixedUse === true;
}

/**
 * Optional Gemini pass run after the rules engine.
 * Gemini may improve explanation wording, apply merchant context, and sharpen
 * mixed-use warnings. It cannot make the final deductible decision, and it
 * cannot raise confidence above the rules engine's own ceiling for that match.
 *
 * Always falls back to the original match on any failure.
 */
export async function refineTransaction(
  match:     DeductionMatch,
  tx:        TransactionInput,
  userType?: string | null,
): Promise<DeductionMatch> {
  if (!GEMINI_ENABLED || !gemini || !shouldRefine(match)) return match;

  const userLabel = (userType && USER_TYPE_LABELS[userType]) ?? "AU taxpayer";
  const isLow     = match.confidence === "LOW";

  const prompt = `Merchant: "${tx.normalizedMerchant}"
Category: ${match.category}
User: ${userLabel}

JSON only:
{"reason":"one sentence why deductible for this user and merchant","confidence":"${isLow ? "LOW or MEDIUM" : "MEDIUM"}","mixedUse":true/false${isLow ? `,"confidenceReason":"one sentence on uncertainty"` : ""}}

${isLow ? "MEDIUM only if clear work purpose. Default LOW." : ""}mixedUse=true if covers personal and work use.`;

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
    if (!text) return match;

    const parsed = JSON.parse(text) as Record<string, unknown>;

    // Validate each field before applying — a bad response must not corrupt data
    const reason           = typeof parsed.reason           === "string"  ? parsed.reason           : undefined;
    const confidenceReason = typeof parsed.confidenceReason === "string"  ? parsed.confidenceReason : undefined;
    const mixedUse         = typeof parsed.mixedUse         === "boolean" ? parsed.mixedUse         : undefined;
    const rawConfidence    = typeof parsed.confidence       === "string"  ? parsed.confidence       : undefined;

    // Enforce confidence bounds:
    //   LOW input  → Gemini may raise to MEDIUM, never to HIGH
    //   MEDIUM input → stays MEDIUM regardless of what Gemini returns
    const refinedConfidence: Confidence = match.confidence === "MEDIUM"
      ? "MEDIUM"
      : rawConfidence === "MEDIUM" ? "MEDIUM" : "LOW";

    return {
      ...match,
      ...(reason           !== undefined && { reason }),
      ...(confidenceReason !== undefined && { confidenceReason }),
      ...(mixedUse         !== undefined && { mixedUse }),
      confidence: refinedConfidence,
    };
  } catch (err) {
    // Log for server-side debugging without leaking details to the user.
    // Omit transaction description/amount — log only app-generated fields.
    console.error("[gemini/refine] fallback:", {
      error:      err instanceof Error ? err.message : String(err),
      merchant:   tx.normalizedMerchant,
      category:   match.category,
      confidence: match.confidence,
    });
    return match;
  }
}

import type { Confidence } from "./types";

export type ScoringSource = "engine" | "gemini" | "safe_fallback";

export function computeScore(params: {
  confidence:   Confidence;
  signals:      Record<string, string | boolean | undefined>;
  mixedUse:     boolean;
  needsReceipt: boolean;
  source:       ScoringSource;
}): number {
  const { confidence, signals, mixedUse, needsReceipt, source } = params;

  // safe_fallback = biz token only, no rule matched — floor score
  if (source === "safe_fallback") return 18;

  let score: number;
  if      (confidence === "HIGH")   score = 83;
  else if (confidence === "MEDIUM") score = 60;
  else                              score = 28;

  // Gemini-only match is less reliable than the rules engine
  if (source === "gemini") score = Math.min(score, 34);

  // Strong signal: matched a known merchant alias
  if (signals.aliasMatch) score += 7;

  // App-store / marketplace catch-all — likely personal
  if (signals.appStore) score = Math.min(score, 28);

  // Fuel and parking are high-commuting-risk: deductible only for work travel,
  // not daily commutes. Penalise so MEDIUM (60) - mixedUse (5) - commutingRisk (20)
  // = 35 < 40 → excludeFromEstimate=true until the user confirms work use.
  if (signals.commutingRisk) score -= 20;

  if (mixedUse)     score -= 5;
  if (needsReceipt) score -= 2;

  return Math.max(10, Math.min(100, score));
}

// score < 72 OR mixedUse → user must explicitly confirm
export function computeReviewRequired(score: number, mixedUse: boolean): boolean {
  return score < 72 || mixedUse;
}

// score < 40 → excluded from estimated totals until user confirms
export function computeExcludeFromEstimate(score: number): boolean {
  return score < 40;
}
